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
