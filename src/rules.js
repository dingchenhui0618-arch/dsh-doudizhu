/**
 * Doudizhu card rules: deck, hand classification, beat relations, and seating order.
 *
 * Ported from Aevi 家庭斗地主 <https://github.com/AurexloveU/doudizhu>,
 * `src/doudizhu-rules.js` (MIT). Adaptations for this plugin: seat-agnostic
 * helpers, bidding helpers, explicit rank/suit ordering constants, sequence
 * limits, and public-view shaping. See THIRD_PARTY_NOTICES.md.
 *
 * Rank order: 大王 > 小王 > 2 > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3.
 * Suits never affect strength.
 */

/** Seat count is fixed at three: one landlord against two farmers. */
export const SEAT_COUNT = 3

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
export const SUITS = ['S', 'H', 'D', 'C']
export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' }

/** Numeric strength per rank. 3 -> 3 ... A -> 14, 2 -> 15, jokers 16 / 17. */
export const RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]))
/**
 * Joker ids. Upstream calls the small joker `LJ`; keep it, because `SJ` would
 * collide with the jack of spades (`S` + `J`) and silently cost the deck a card.
 */
export const JOKER_VALUES = { LJ: 16, BJ: 17 }
export const SMALL_JOKER = 'LJ'
export const BIG_JOKER = 'BJ'
export const MAX_SEQUENCE_VALUE = 14 // A; 2 (15) and jokers are excluded from sequences.

export const MIN_STRAIGHT = 5
export const MIN_PAIR_STRAIGHT = 3
export const MIN_PLANE = 2

export const MOVE_LABELS = {
  single: '单张',
  pair: '对子',
  triple: '三张',
  triple_single: '三带一',
  triple_pair: '三带一对',
  straight: '顺子',
  pair_straight: '连对',
  plane: '飞机',
  plane_single: '飞机带单',
  plane_pair: '飞机带对',
  four_two: '四带二',
  four_two_pairs: '四带两对',
  bomb: '炸弹',
  rocket: '王炸',
}

export const BID_LABELS = { 0: '不叫', 1: '1 分', 2: '2 分', 3: '3 分' }

/**
 * Build one card from its id. Suited ids are `<suit><rank>` (e.g. `S3`, `H10`,
 * `SJ` for the jack of spades); the jokers are `LJ` (small) and `BJ` (big).
 * Returns null for anything unknown.
 */
export function cardFromId(id) {
  const text = String(id ?? '')
  if (text === SMALL_JOKER) {
    return { id: SMALL_JOKER, suit: 'J', rank: '小王', value: JOKER_VALUES.LJ, label: '小王', joker: true }
  }
  if (text === BIG_JOKER) {
    return { id: BIG_JOKER, suit: 'J', rank: '大王', value: JOKER_VALUES.BJ, label: '大王', joker: true }
  }
  const suit = text.slice(0, 1)
  const rank = text.slice(1)
  if (!SUITS.includes(suit) || !Object.hasOwn(RANK_VALUES, rank)) return null
  return { id: text, suit, rank, value: RANK_VALUES[rank], label: `${SUIT_SYMBOLS[suit]}${rank}`, joker: false }
}

/** The full 54-card deck: 13 ranks x 4 suits plus the two jokers. */
export function createDeck() {
  const deck = []
  for (const rank of RANKS) {
    for (const suit of SUITS) deck.push(cardFromId(`${suit}${rank}`))
  }
  deck.push(cardFromId(SMALL_JOKER), cardFromId(BIG_JOKER))
  return deck
}

export function deckIds() {
  return createDeck().map((card) => card.id)
}

/**
 * Fisher-Yates shuffle over a copy of `deck`. `rng(max)` must return an integer
 * in `[0, max)`.
 *
 * The default is `Math.random`, because this module is bundled into the browser
 * half and must stay free of Node built-ins. That default is a fallback for
 * convenience only: the authority always passes a crypto-backed rng (see
 * `createRoom` in room.js), and tests pass a seeded one.
 */
export function shuffleDeck(deck = createDeck(), rng = defaultRng) {
  const next = deck.map((card) => ({ ...card }))
  for (let index = next.length - 1; index > 0; index -= 1) {
    const other = rng(index + 1)
    ;[next[index], next[other]] = [next[other], next[index]]
  }
  return next
}

function defaultRng(max) {
  return Math.floor(Math.random() * max)
}

/** Strongest first (value desc), suit order as a stable tiebreak. */
export function sortCardIds(ids = []) {
  return [...ids].sort((leftId, rightId) => {
    const left = cardFromId(leftId)
    const right = cardFromId(rightId)
    if (!left || !right) return String(leftId).localeCompare(String(rightId))
    if (left.value !== right.value) return right.value - left.value
    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit)
  })
}

export function sortCards(cards = []) {
  return sortCardIds(cards.map((card) => (typeof card === 'string' ? card : card.id))).map(cardFromId)
}

/** Highest value present in a hand — used by bidding heuristics and hints. */
export function handStrength(handIds = []) {
  const values = handIds.map((id) => cardFromId(id)?.value).filter(Boolean)
  if (!values.length) return 0
  const bombs = countBombs(handIds)
  return values.reduce((sum, value) => sum + value, 0) + bombs * 20
}

/** How many bombs (four of a kind, jokers excluded) the hand holds. */
export function countBombs(handIds = []) {
  const counts = countsForIds(handIds)
  let bombs = 0
  for (const [value, count] of counts) {
    if (count === 4 && value <= RANK_VALUES['2']) bombs += 1
  }
  return bombs
}

export function hasRocket(handIds = []) {
  const hand = new Set(handIds)
  return hand.has(SMALL_JOKER) && hand.has(BIG_JOKER)
}

function countsForIds(ids = []) {
  const counts = new Map()
  for (const id of ids) {
    const card = cardFromId(id)
    if (!card) continue
    counts.set(card.value, (counts.get(card.value) || 0) + 1)
  }
  return counts
}

function countsForCards(cards = []) {
  const counts = new Map()
  for (const card of cards) counts.set(card.value, (counts.get(card.value) || 0) + 1)
  return counts
}

/** True when every value is strictly sequential and none exceeds A. */
function consecutive(values) {
  if (!values.length || values[values.length - 1] > MAX_SEQUENCE_VALUE) return false
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1] + 1) return false
  }
  return true
}

function move(type, size, mainValue, extra = {}) {
  return {
    type,
    label: MOVE_LABELS[type],
    size,
    mainValue,
    sequenceLength: extra.sequenceLength || 1,
    wingType: extra.wingType || 'none',
    isBomb: type === 'bomb' || type === 'rocket',
    isRocket: type === 'rocket',
  }
}

/**
 * Recognise 飞机 in its three shapes. The core must be `>= MIN_PLANE` strictly
 * consecutive triples drawn from ranks at or below A; a rank holding four cards
 * cannot be split to supply a core triple. Wings must match the core length
 * exactly: one single per triple, or one pair per triple.
 */
function planeMove(cards, counts) {
  const size = cards.length
  const tripleValues = [...counts.entries()]
    .filter(([value, count]) => value <= MAX_SEQUENCE_VALUE && count >= 3)
    .map(([value]) => value)
    .sort((a, b) => a - b)
  if (tripleValues.length < MIN_PLANE) return null

  const possibleCoreLengths = []
  if (size % 3 === 0) possibleCoreLengths.push({ length: size / 3, type: 'plane', wingType: 'none' })
  if (size % 4 === 0) possibleCoreLengths.push({ length: size / 4, type: 'plane_single', wingType: 'single' })
  if (size % 5 === 0) possibleCoreLengths.push({ length: size / 5, type: 'plane_pair', wingType: 'pair' })

  for (const candidate of possibleCoreLengths.sort((a, b) => b.length - a.length)) {
    const coreLength = candidate.length
    if (!Number.isInteger(coreLength) || coreLength < MIN_PLANE || tripleValues.length < coreLength) continue
    for (let start = 0; start <= tripleValues.length - coreLength; start += 1) {
      const core = tripleValues.slice(start, start + coreLength)
      if (!consecutive(core)) continue
      const remaining = new Map(counts)
      let valid = true
      for (const value of core) {
        const original = remaining.get(value) || 0
        if (original !== 3) {
          valid = false
          break
        }
        remaining.delete(value)
      }
      if (!valid) continue
      const restCounts = [...remaining.values()]
      const restSize = restCounts.reduce((sum, count) => sum + count, 0)
      if (candidate.wingType === 'none' && restSize === 0) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength })
      }
      if (candidate.wingType === 'single' && restSize === coreLength) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength, wingType: 'single' })
      }
      if (
        candidate.wingType === 'pair' &&
        restSize === coreLength * 2 &&
        restCounts.length === coreLength &&
        restCounts.every((count) => count === 2)
      ) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength, wingType: 'pair' })
      }
    }
  }
  return null
}

/**
 * Classify one played group. Returns null when the cards are not a legal shape,
 * when an id is unknown, or when the same card id is used twice.
 */
export function classifyMove(cardIds = []) {
  if (!Array.isArray(cardIds) || !cardIds.length || new Set(cardIds).size !== cardIds.length) return null
  const cards = cardIds.map(cardFromId)
  if (cards.some((card) => !card)) return null
  const size = cards.length
  const counts = countsForCards(cards)
  const entries = [...counts.entries()].sort((a, b) => a[0] - b[0])
  const values = entries.map(([value]) => value)
  const countPattern = entries.map(([, count]) => count).sort((a, b) => b - a)

  if (size === 2 && values.length === 2 && values[0] === JOKER_VALUES.LJ && values[1] === JOKER_VALUES.BJ) {
    return move('rocket', size, JOKER_VALUES.BJ)
  }
  if (values.length === 1) {
    if (size === 1) return move('single', size, values[0])
    if (size === 2) return move('pair', size, values[0])
    if (size === 3) return move('triple', size, values[0])
    if (size === 4) return move('bomb', size, values[0])
  }
  if (size === 4 && countPattern[0] === 3 && countPattern[1] === 1) {
    const mainValue = entries.find(([, count]) => count === 3)[0]
    return move('triple_single', size, mainValue, { wingType: 'single' })
  }
  if (size === 5 && countPattern[0] === 3 && countPattern[1] === 2) {
    const mainValue = entries.find(([, count]) => count === 3)[0]
    return move('triple_pair', size, mainValue, { wingType: 'pair' })
  }
  if (size >= MIN_STRAIGHT && entries.every(([, count]) => count === 1) && consecutive(values)) {
    return move('straight', size, values.at(-1), { sequenceLength: size })
  }
  if (
    size >= MIN_PAIR_STRAIGHT * 2 &&
    size % 2 === 0 &&
    entries.length >= MIN_PAIR_STRAIGHT &&
    entries.every(([, count]) => count === 2) &&
    consecutive(values)
  ) {
    return move('pair_straight', size, values.at(-1), { sequenceLength: entries.length })
  }

  const plane = planeMove(cards, counts)
  if (plane) return plane

  if (size === 6) {
    const four = entries.filter(([, count]) => count === 4)
    if (four.length === 1) return move('four_two', size, four[0][0], { wingType: 'single' })
  }
  if (size === 8) {
    const four = entries.filter(([, count]) => count === 4)
    const pairs = entries.filter(([, count]) => count === 2)
    if (four.length === 1 && pairs.length === 2) return move('four_two_pairs', size, four[0][0], { wingType: 'pair' })
  }
  return null
}

/**
 * Can `candidate` be played on top of `target`? Same shape and length, higher
 * main value; bombs beat every non-bomb shape; the rocket beats everything.
 * 四带二 is deliberately not a bomb.
 */
export function canBeat(candidate, target) {
  if (!candidate || !target) return false
  if (candidate.type === 'rocket') return target.type !== 'rocket'
  if (target.type === 'rocket') return false
  if (candidate.type === 'bomb' && target.type !== 'bomb') return true
  if (target.type === 'bomb' && candidate.type !== 'bomb') return false
  if (candidate.type !== target.type) return false
  if (candidate.size !== target.size || candidate.sequenceLength !== target.sequenceLength) return false
  return candidate.mainValue > target.mainValue
}

/** Every selected card must be a distinct card actually held. */
export function cardsBelongToHand(cardIds = [], handIds = []) {
  const hand = new Set(handIds)
  return cardIds.length > 0 && new Set(cardIds).size === cardIds.length && cardIds.every((id) => hand.has(id))
}

export function removeCards(handIds = [], cardIds = []) {
  const removing = new Set(cardIds)
  return handIds.filter((id) => !removing.has(id))
}

/** Weakest legal card, used when a forced lead needs a fallback. */
export function smallestLead(handIds = []) {
  const cards = handIds
    .map(cardFromId)
    .filter(Boolean)
    .sort((left, right) => left.value - right.value || SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit))
  return cards.length ? [cards[0].id] : []
}

export function labelsForCards(cardIds = []) {
  return cardIds.map((id) => cardFromId(id)?.label || id)
}

/** The public, per-card shape that may be sent to clients. */
export function cardPublicView(id) {
  const card = cardFromId(id)
  return card ? { id: card.id, rank: card.rank, suit: card.suit, value: card.value, label: card.label } : null
}

export function cardsPublicView(ids = []) {
  return ids.map(cardPublicView).filter(Boolean)
}

/**
 * Whose turn follows. Seats are 0..2 and play always moves forward, so the
 * order is clockwise by construction; the landlord seat never reorders it.
 */
export function nextSeat(seat, seats = SEAT_COUNT) {
  return ((seat % seats) + 1 + seats) % seats
}

/** Seats in clockwise order starting at `from`, inclusive of the start. */
export function seatOrderFrom(from, seats = SEAT_COUNT) {
  const order = []
  for (let step = 0; step < seats; step += 1) order.push((from + step) % seats)
  return order
}

/** Role of each seat for one hand. `landlord` is a seat index or null. */
export function rolesFor(landlord, seats = SEAT_COUNT) {
  return Array.from({ length: seats }, (_, seat) => (seat === landlord ? 'landlord' : 'farmer'))
}

/** Landlord wins when the landlord empties first; farmers win when either does. */
export function winnerSide(finishedSeat, landlord) {
  return finishedSeat === landlord ? 'landlord' : 'farmers'
}

/* ------------------------------------------------------------ move search -- */

/**
 * Bounded memo for the two hot functions. A policy asks "how many turns does this
 * hand still need" once per candidate move, and the same sub-hands come back over
 * and over inside one game, so without this the search is quadratic in a way that
 * makes a league run take minutes instead of seconds.
 *
 * The cache is cleared wholesale when it grows past its limit: these functions
 * are pure, so throwing entries away is always safe, and an LRU would buy very
 * little for the extra bookkeeping.
 */
const GENERATION_CACHE = new Map()
const PLAN_CACHE = new Map()
const CACHE_LIMIT = 6000

function cacheKey(handIds, tag) {
  return `${tag}|${handIds.length}|${[...handIds].sort().join(',')}`
}

function memoized(cache, key, compute) {
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const value = compute()
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, value)
  return value
}

/**
 * Every shape a hand can play, generated rather than guessed.
 *
 * The bot needs this and nothing else: given a hand, which legal moves exist?
 * One representative is kept per `(type, size, mainValue)` — the *lowest* cards of
 * that shape — because the alternative (every suit-level combination) multiplies
 * the search space without changing what any move can beat.
 *
 * Two properties this function must keep, both tested:
 * - **Nothing invented.** Every candidate is handed to `classifyMove` before it
 *   is emitted, so the generator can never produce a shape the engine rejects.
 *   The generator and the classifier disagreeing is the bug that would matter
 *   most, and this is what prevents it.
 * - **Bounded.** `limit` caps the output; `types` restricts generation to the
 *   shapes a caller cares about, which is what keeps a following move cheap.
 *
 * The result is memoized and therefore **shared**: callers must not sort or
 * otherwise mutate the returned array in place. Every caller in this repo copies
 * first (`[...moves].sort(...)`).
 */
export function enumerateMoves(handIds = [], { limit = 400, types = null } = {}) {
  const tag = `${limit}|${types ? [...types].sort().join('|') : '*'}`
  return memoized(GENERATION_CACHE, cacheKey(handIds, tag), () => generateMoves(handIds, limit, types))
}

function generateMoves(handIds, limit, types) {
  const wanted = types ? new Set(types) : null
  const wants = (type) => !wanted || wanted.has(type)
  const groups = groupByValue(handIds)
  const values = [...groups.keys()].sort((left, right) => left - right)
  const out = []

  // Every candidate goes through the real classifier: a generated move that the
  // engine would refuse must never reach a caller.
  const add = (ids) => {
    if (!ids || !ids.length || out.length >= limit) return
    const shape = classifyMove(ids)
    if (!shape || !wants(shape.type)) return
    out.push({ cardIds: ids, move: shape })
  }
  // Wings are optional: when a hand cannot supply them the base shape stands on
  // its own, and spreading `null` here would throw instead.
  const addWithWings = (ids, wings) => {
    if (wings) add([...ids, ...wings])
  }

  if (wants('single') || wants('pair') || wants('triple') || wants('bomb')) {
    for (const value of values) {
      const held = groups.get(value)
      if (wants('single')) add(pick(groups, value, 1))
      if (held.length >= 2 && wants('pair')) add(pick(groups, value, 2))
      if (held.length >= 3 && wants('triple')) add(pick(groups, value, 3))
      // A rank with four cards can never supply a plane core (see planeMove), so
      // a bomb and a triple from the same rank are not interchangeable.
      if (held.length === 4 && wants('bomb')) add(pick(groups, value, 4))
    }
  }

  if (wants('rocket') && groups.has(JOKER_VALUES.LJ) && groups.has(JOKER_VALUES.BJ)) {
    add([SMALL_JOKER, BIG_JOKER])
  }

  if (wants('triple_single') || wants('triple_pair')) {
    for (const value of values) {
      if (groups.get(value).length !== 3) continue
      const core = pick(groups, value, 3)
      if (wants('triple_single')) addWithWings(core, weakestWings(groups, [value], 1, 1, values))
      if (wants('triple_pair')) addWithWings(core, weakestWings(groups, [value], 1, 2, values))
    }
  }

  if (wants('straight')) {
    for (const run of runsOf(values, MIN_STRAIGHT)) {
      for (let length = MIN_STRAIGHT; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          add(run.slice(start, start + length).map((value) => pick(groups, value, 1)[0]))
        }
      }
    }
  }

  if (wants('pair_straight')) {
    const pairValues = values.filter((value) => groups.get(value).length >= 2)
    for (const run of runsOf(pairValues, MIN_PAIR_STRAIGHT)) {
      for (let length = MIN_PAIR_STRAIGHT; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          add(run.slice(start, start + length).flatMap((value) => pick(groups, value, 2)))
        }
      }
    }
  }

  if (wants('plane') || wants('plane_single') || wants('plane_pair')) {
    // Exactly three cards per core rank: planeMove refuses to split a bomb.
    const coreValues = values.filter((value) => groups.get(value).length === 3)
    for (const run of runsOf(coreValues, MIN_PLANE)) {
      for (let length = MIN_PLANE; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          const slice = run.slice(start, start + length)
          const core = slice.flatMap((value) => pick(groups, value, 3))
          if (wants('plane')) add(core)
          if (wants('plane_single')) addWithWings(core, weakestWings(groups, slice, length, 1, values))
          if (wants('plane_pair')) addWithWings(core, weakestWings(groups, slice, length, 2, values))
        }
      }
    }
  }

  if (wants('four_two') || wants('four_two_pairs')) {
    for (const value of values) {
      if (groups.get(value).length !== 4) continue
      const core = pick(groups, value, 4)
      if (wants('four_two')) addWithWings(core, weakestWings(groups, [value], 2, 1, values))
      if (wants('four_two_pairs')) addWithWings(core, weakestWings(groups, [value], 2, 2, values))
    }
  }

  return out
}

/** The moves in `handIds` that can legally follow `target`. */
export function enumerateBeats(handIds = [], target, { limit = 400 } = {}) {
  if (!target) return enumerateMoves(handIds, { limit })
  // Only the matching shape plus the two things that beat anything else.
  const types = target.type === 'bomb' ? ['bomb', 'rocket'] : [target.type, 'bomb', 'rocket']
  return enumerateMoves(handIds, { limit, types }).filter((candidate) => canBeat(candidate.move, target))
}

/** Stable identity for a shape, used to de-duplicate candidates. */
export function moveKey(move) {
  if (!move) return ''
  return `${move.type}:${move.size}:${move.mainValue}:${move.sequenceLength}`
}

/**
 * A greedy plan for emptying a hand: which groups to play, in order. Used by the
 * bot as a *heuristic* — "how many turns do I still need?" — not as a rule. It is
 * deliberately not optimal; it only has to rank two candidate moves correctly,
 * and the priority order below is what makes the ranking sensible: shed whole
 * structures before singles.
 */
export function handPlan(handIds = []) {
  return memoized(PLAN_CACHE, cacheKey(handIds, 'plan'), () => planHand(handIds))
}

function planHand(handIds) {
  const moves = []
  let rest = [...handIds]
  let guard = 0
  while (rest.length && guard < 40) {
    guard += 1
    const candidates = enumerateMoves(rest, { types: PLAN_ORDER })
    if (!candidates.length) break
    let best = null
    let bestScore = -Infinity
    for (const candidate of candidates) {
      const score = (PLAN_BONUS[candidate.move.type] ?? 0) + candidate.move.size
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }
    moves.push(best.move)
    rest = removeCards(rest, best.cardIds)
  }
  return { moves, count: moves.length, leftover: rest }
}

/** Shape preference when shedding: structures first, singles last. */
const PLAN_ORDER = [
  'plane_pair',
  'plane_single',
  'plane',
  'straight',
  'pair_straight',
  'four_two_pairs',
  'four_two',
  'triple_pair',
  'triple_single',
  'triple',
  'pair',
  'single',
  'bomb',
  'rocket',
]

const PLAN_BONUS = {
  plane_pair: 14,
  plane_single: 12,
  plane: 10,
  straight: 8,
  pair_straight: 8,
  four_two_pairs: 6,
  four_two: 5,
  triple_pair: 5,
  triple_single: 4,
  triple: 3,
  pair: 2,
  single: 0,
  bomb: 20,
  rocket: 22,
}

/** How many turns this hand still needs, by the greedy plan above. */
export function movesToEmpty(handIds = []) {
  return handPlan(handIds).count
}

/**
 * Can any single opponent, holding only cards from `outstanding`, beat `shape`?
 *
 * This is sound *as a possibility*: it answers "is there a beating combination in
 * the cards nobody has played yet", never "does seat 2 hold it". A bot may use
 * this because every card it counts is public — its own hand plus everything
 * played — but it must not use it to name a seat.
 */
export function beatableFromOutstanding(shape, outstanding) {
  if (!shape) return true
  if (shape.type === 'rocket') return false
  const values = [...outstanding.keys()].sort((left, right) => left - right)
  if (values.includes(BIG_JOKER) && values.includes(SMALL_JOKER)) return true
  if (shape.type !== 'bomb' && values.some((value) => (outstanding.get(value) || 0) === 4)) return true

  const higher = values.filter((value) => value > shape.mainValue)
  const countAt = (value) => outstanding.get(value) || 0
  switch (shape.type) {
    case 'single':
      return higher.some((value) => countAt(value) >= 1)
    case 'pair':
      return higher.some((value) => countAt(value) >= 2)
    case 'triple':
      return higher.some((value) => countAt(value) >= 3)
    case 'bomb':
      // Only a higher four-of-a-kind; the rocket was already handled above.
      return higher.some((value) => countAt(value) === 4)
    case 'triple_single':
    case 'triple_pair':
      return higher.some((value) => countAt(value) >= 3)
    case 'four_two':
    case 'four_two_pairs':
      return false
    case 'straight':
    case 'pair_straight':
    case 'plane':
    case 'plane_single':
    case 'plane_pair': {
      const per = shape.type === 'pair_straight' || shape.type === 'plane_pair' ? 2 : shape.type === 'straight' ? 1 : 3
      const length = shape.sequenceLength
      const top = shape.mainValue - length + 1
      // A beating run is a window of the same length starting strictly higher.
      // Anything longer would not be the same shape and could not be played on it.
      for (let start = top + 1; start + length - 1 <= MAX_SEQUENCE_VALUE; start += 1) {
        let ok = true
        for (let step = 0; step < length; step += 1) {
          if (countAt(start + step) < per) {
            ok = false
            break
          }
        }
        if (ok) return true
      }
      // The wings of a plane still have to exist, and this function does not model
      // them: say "no" rather than overstate a certainty it cannot back up.
      return false
    }
    default:
      return true
  }
}

/** Group a hand by rank value; each group is ordered weakest suit first. */
function groupByValue(handIds) {
  const groups = new Map()
  for (const id of handIds) {
    const card = cardFromId(id)
    if (!card) continue
    const list = groups.get(card.value)
    if (list) list.push(id)
    else groups.set(card.value, [id])
  }
  for (const list of groups.values()) {
    list.sort((left, right) => SUITS.indexOf(cardFromId(left).suit) - SUITS.indexOf(cardFromId(right).suit))
  }
  return groups
}

function pick(groups, value, count) {
  const list = groups.get(value)
  return list && list.length >= count ? list.slice(0, count) : null
}

/**
 * `total * per` extra cards for a structure, taken from the weakest ranks that
 * are not part of it.
 *
 * With `per === 1` any cards do — 四带二 may carry a pair as its "two singles",
 * so refusing to take two cards from one rank would silently lose legal moves.
 * One card per rank is taken first, so a pair is only broken when the hand leaves
 * no choice. With `per === 2` each chosen rank must supply a whole pair.
 * Returns null when the hand cannot supply them.
 */
function weakestWings(groups, exclude, total, per, values) {
  const skip = new Set(exclude)
  const pool = values.filter((value) => !skip.has(value))
  if (per === 1) {
    const wings = []
    for (const value of pool) {
      wings.push(groups.get(value)[0])
      if (wings.length === total) return wings
    }
    for (const value of pool) {
      for (const id of groups.get(value).slice(1)) {
        wings.push(id)
        if (wings.length === total) return wings
      }
    }
    return null
  }
  const wings = []
  for (const value of pool) {
    if ((groups.get(value)?.length ?? 0) < per) continue
    wings.push(...pick(groups, value, per))
    if (wings.length >= total * per) return wings
  }
  return null
}

/** Maximal runs of consecutive values (all <= A), keeping those >= `minLength`. */
function runsOf(values, minLength) {
  const sorted = [...values].filter((value) => value <= MAX_SEQUENCE_VALUE).sort((left, right) => left - right)
  const runs = []
  let start = 0
  for (let index = 1; index <= sorted.length; index += 1) {
    const broken = index === sorted.length || sorted[index] !== sorted[index - 1] + 1
    if (!broken) continue
    const run = sorted.slice(start, index)
    start = index
    if (run.length >= minLength) runs.push(run)
  }
  return runs
}

