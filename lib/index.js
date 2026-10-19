// src/host.js
import { timingSafeEqual } from "node:crypto";

// src/net.js
import http from "node:http";
import net from "node:net";
import { networkInterfaces } from "node:os";

// src/rules.js
var SEAT_COUNT = 3;
var RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
var SUITS = ["S", "H", "D", "C"];
var SUIT_SYMBOLS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
var RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
var JOKER_VALUES = { LJ: 16, BJ: 17 };
var SMALL_JOKER = "LJ";
var BIG_JOKER = "BJ";
var MAX_SEQUENCE_VALUE = 14;
var MIN_STRAIGHT = 5;
var MIN_PAIR_STRAIGHT = 3;
var MIN_PLANE = 2;
var MOVE_LABELS = {
  single: "\u5355\u5F20",
  pair: "\u5BF9\u5B50",
  triple: "\u4E09\u5F20",
  triple_single: "\u4E09\u5E26\u4E00",
  triple_pair: "\u4E09\u5E26\u4E00\u5BF9",
  straight: "\u987A\u5B50",
  pair_straight: "\u8FDE\u5BF9",
  plane: "\u98DE\u673A",
  plane_single: "\u98DE\u673A\u5E26\u5355",
  plane_pair: "\u98DE\u673A\u5E26\u5BF9",
  four_two: "\u56DB\u5E26\u4E8C",
  four_two_pairs: "\u56DB\u5E26\u4E24\u5BF9",
  bomb: "\u70B8\u5F39",
  rocket: "\u738B\u70B8"
};
var BID_LABELS = { 0: "\u4E0D\u53EB", 1: "1 \u5206", 2: "2 \u5206", 3: "3 \u5206" };
function cardFromId(id) {
  const text = String(id ?? "");
  if (text === SMALL_JOKER) {
    return { id: SMALL_JOKER, suit: "J", rank: "\u5C0F\u738B", value: JOKER_VALUES.LJ, label: "\u5C0F\u738B", joker: true };
  }
  if (text === BIG_JOKER) {
    return { id: BIG_JOKER, suit: "J", rank: "\u5927\u738B", value: JOKER_VALUES.BJ, label: "\u5927\u738B", joker: true };
  }
  const suit = text.slice(0, 1);
  const rank = text.slice(1);
  if (!SUITS.includes(suit) || !Object.hasOwn(RANK_VALUES, rank)) return null;
  return { id: text, suit, rank, value: RANK_VALUES[rank], label: `${SUIT_SYMBOLS[suit]}${rank}`, joker: false };
}
function createDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) deck.push(cardFromId(`${suit}${rank}`));
  }
  deck.push(cardFromId(SMALL_JOKER), cardFromId(BIG_JOKER));
  return deck;
}
function deckIds() {
  return createDeck().map((card) => card.id);
}
function shuffleDeck(deck = createDeck(), rng = defaultRng) {
  const next = deck.map((card) => ({ ...card }));
  for (let index = next.length - 1; index > 0; index -= 1) {
    const other = rng(index + 1);
    [next[index], next[other]] = [next[other], next[index]];
  }
  return next;
}
function defaultRng(max) {
  return Math.floor(Math.random() * max);
}
function sortCardIds(ids = []) {
  return [...ids].sort((leftId, rightId) => {
    const left = cardFromId(leftId);
    const right = cardFromId(rightId);
    if (!left || !right) return String(leftId).localeCompare(String(rightId));
    if (left.value !== right.value) return right.value - left.value;
    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
  });
}
function countBombs(handIds = []) {
  const counts = countsForIds(handIds);
  let bombs = 0;
  for (const [value, count] of counts) {
    if (count === 4 && value <= RANK_VALUES["2"]) bombs += 1;
  }
  return bombs;
}
function hasRocket(handIds = []) {
  const hand = new Set(handIds);
  return hand.has(SMALL_JOKER) && hand.has(BIG_JOKER);
}
function countsForIds(ids = []) {
  const counts = /* @__PURE__ */ new Map();
  for (const id of ids) {
    const card = cardFromId(id);
    if (!card) continue;
    counts.set(card.value, (counts.get(card.value) || 0) + 1);
  }
  return counts;
}
function countsForCards(cards = []) {
  const counts = /* @__PURE__ */ new Map();
  for (const card of cards) counts.set(card.value, (counts.get(card.value) || 0) + 1);
  return counts;
}
function consecutive(values) {
  if (!values.length || values[values.length - 1] > MAX_SEQUENCE_VALUE) return false;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1] + 1) return false;
  }
  return true;
}
function move(type, size, mainValue, extra = {}) {
  return {
    type,
    label: MOVE_LABELS[type],
    size,
    mainValue,
    sequenceLength: extra.sequenceLength || 1,
    wingType: extra.wingType || "none",
    isBomb: type === "bomb" || type === "rocket",
    isRocket: type === "rocket"
  };
}
function planeMove(cards, counts) {
  const size = cards.length;
  const tripleValues = [...counts.entries()].filter(([value, count]) => value <= MAX_SEQUENCE_VALUE && count >= 3).map(([value]) => value).sort((a, b) => a - b);
  if (tripleValues.length < MIN_PLANE) return null;
  const possibleCoreLengths = [];
  if (size % 3 === 0) possibleCoreLengths.push({ length: size / 3, type: "plane", wingType: "none" });
  if (size % 4 === 0) possibleCoreLengths.push({ length: size / 4, type: "plane_single", wingType: "single" });
  if (size % 5 === 0) possibleCoreLengths.push({ length: size / 5, type: "plane_pair", wingType: "pair" });
  for (const candidate of possibleCoreLengths.sort((a, b) => b.length - a.length)) {
    const coreLength = candidate.length;
    if (!Number.isInteger(coreLength) || coreLength < MIN_PLANE || tripleValues.length < coreLength) continue;
    for (let start = 0; start <= tripleValues.length - coreLength; start += 1) {
      const core = tripleValues.slice(start, start + coreLength);
      if (!consecutive(core)) continue;
      const remaining = new Map(counts);
      let valid = true;
      for (const value of core) {
        const original = remaining.get(value) || 0;
        if (original !== 3) {
          valid = false;
          break;
        }
        remaining.delete(value);
      }
      if (!valid) continue;
      const restCounts = [...remaining.values()];
      const restSize = restCounts.reduce((sum, count) => sum + count, 0);
      if (candidate.wingType === "none" && restSize === 0) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength });
      }
      if (candidate.wingType === "single" && restSize === coreLength) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength, wingType: "single" });
      }
      if (candidate.wingType === "pair" && restSize === coreLength * 2 && restCounts.length === coreLength && restCounts.every((count) => count === 2)) {
        return move(candidate.type, size, core.at(-1), { sequenceLength: coreLength, wingType: "pair" });
      }
    }
  }
  return null;
}
function classifyMove(cardIds = []) {
  if (!Array.isArray(cardIds) || !cardIds.length || new Set(cardIds).size !== cardIds.length) return null;
  const cards = cardIds.map(cardFromId);
  if (cards.some((card) => !card)) return null;
  const size = cards.length;
  const counts = countsForCards(cards);
  const entries = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const values = entries.map(([value]) => value);
  const countPattern = entries.map(([, count]) => count).sort((a, b) => b - a);
  if (size === 2 && values.length === 2 && values[0] === JOKER_VALUES.LJ && values[1] === JOKER_VALUES.BJ) {
    return move("rocket", size, JOKER_VALUES.BJ);
  }
  if (values.length === 1) {
    if (size === 1) return move("single", size, values[0]);
    if (size === 2) return move("pair", size, values[0]);
    if (size === 3) return move("triple", size, values[0]);
    if (size === 4) return move("bomb", size, values[0]);
  }
  if (size === 4 && countPattern[0] === 3 && countPattern[1] === 1) {
    const mainValue = entries.find(([, count]) => count === 3)[0];
    return move("triple_single", size, mainValue, { wingType: "single" });
  }
  if (size === 5 && countPattern[0] === 3 && countPattern[1] === 2) {
    const mainValue = entries.find(([, count]) => count === 3)[0];
    return move("triple_pair", size, mainValue, { wingType: "pair" });
  }
  if (size >= MIN_STRAIGHT && entries.every(([, count]) => count === 1) && consecutive(values)) {
    return move("straight", size, values.at(-1), { sequenceLength: size });
  }
  if (size >= MIN_PAIR_STRAIGHT * 2 && size % 2 === 0 && entries.length >= MIN_PAIR_STRAIGHT && entries.every(([, count]) => count === 2) && consecutive(values)) {
    return move("pair_straight", size, values.at(-1), { sequenceLength: entries.length });
  }
  const plane = planeMove(cards, counts);
  if (plane) return plane;
  if (size === 6) {
    const four = entries.filter(([, count]) => count === 4);
    if (four.length === 1) return move("four_two", size, four[0][0], { wingType: "single" });
  }
  if (size === 8) {
    const four = entries.filter(([, count]) => count === 4);
    const pairs = entries.filter(([, count]) => count === 2);
    if (four.length === 1 && pairs.length === 2) return move("four_two_pairs", size, four[0][0], { wingType: "pair" });
  }
  return null;
}
function canBeat(candidate, target) {
  if (!candidate || !target) return false;
  if (candidate.type === "rocket") return target.type !== "rocket";
  if (target.type === "rocket") return false;
  if (candidate.type === "bomb" && target.type !== "bomb") return true;
  if (target.type === "bomb" && candidate.type !== "bomb") return false;
  if (candidate.type !== target.type) return false;
  if (candidate.size !== target.size || candidate.sequenceLength !== target.sequenceLength) return false;
  return candidate.mainValue > target.mainValue;
}
function cardsBelongToHand(cardIds = [], handIds = []) {
  const hand = new Set(handIds);
  return cardIds.length > 0 && new Set(cardIds).size === cardIds.length && cardIds.every((id) => hand.has(id));
}
function removeCards(handIds = [], cardIds = []) {
  const removing = new Set(cardIds);
  return handIds.filter((id) => !removing.has(id));
}
function smallestLead(handIds = []) {
  const cards = handIds.map(cardFromId).filter(Boolean).sort((left, right) => left.value - right.value || SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit));
  return cards.length ? [cards[0].id] : [];
}
function nextSeat(seat, seats = SEAT_COUNT) {
  return (seat % seats + 1 + seats) % seats;
}
function seatOrderFrom(from, seats = SEAT_COUNT) {
  const order = [];
  for (let step = 0; step < seats; step += 1) order.push((from + step) % seats);
  return order;
}
function winnerSide(finishedSeat, landlord) {
  return finishedSeat === landlord ? "landlord" : "farmers";
}
var GENERATION_CACHE = /* @__PURE__ */ new Map();
var PLAN_CACHE = /* @__PURE__ */ new Map();
var CACHE_LIMIT = 6e3;
function cacheKey(handIds, tag) {
  return `${tag}|${handIds.length}|${[...handIds].sort().join(",")}`;
}
function memoized(cache, key, compute) {
  const hit = cache.get(key);
  if (hit !== void 0) return hit;
  const value = compute();
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, value);
  return value;
}
function enumerateMoves(handIds = [], { limit = 400, types = null } = {}) {
  const tag = `${limit}|${types ? [...types].sort().join("|") : "*"}`;
  return memoized(GENERATION_CACHE, cacheKey(handIds, tag), () => generateMoves(handIds, limit, types));
}
function generateMoves(handIds, limit, types) {
  const wanted = types ? new Set(types) : null;
  const wants = (type) => !wanted || wanted.has(type);
  const groups = groupByValue(handIds);
  const values = [...groups.keys()].sort((left, right) => left - right);
  const out = [];
  const add = (ids) => {
    if (!ids || !ids.length || out.length >= limit) return;
    const shape = classifyMove(ids);
    if (!shape || !wants(shape.type)) return;
    out.push({ cardIds: ids, move: shape });
  };
  const addWithWings = (ids, wings) => {
    if (wings) add([...ids, ...wings]);
  };
  if (wants("single") || wants("pair") || wants("triple") || wants("bomb")) {
    for (const value of values) {
      const held = groups.get(value);
      if (wants("single")) add(pick(groups, value, 1));
      if (held.length >= 2 && wants("pair")) add(pick(groups, value, 2));
      if (held.length >= 3 && wants("triple")) add(pick(groups, value, 3));
      if (held.length === 4 && wants("bomb")) add(pick(groups, value, 4));
    }
  }
  if (wants("rocket") && groups.has(JOKER_VALUES.LJ) && groups.has(JOKER_VALUES.BJ)) {
    add([SMALL_JOKER, BIG_JOKER]);
  }
  if (wants("triple_single") || wants("triple_pair")) {
    for (const value of values) {
      if (groups.get(value).length !== 3) continue;
      const core = pick(groups, value, 3);
      if (wants("triple_single")) addWithWings(core, weakestWings(groups, [value], 1, 1, values));
      if (wants("triple_pair")) addWithWings(core, weakestWings(groups, [value], 1, 2, values));
    }
  }
  if (wants("straight")) {
    for (const run of runsOf(values, MIN_STRAIGHT)) {
      for (let length = MIN_STRAIGHT; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          add(run.slice(start, start + length).map((value) => pick(groups, value, 1)[0]));
        }
      }
    }
  }
  if (wants("pair_straight")) {
    const pairValues = values.filter((value) => groups.get(value).length >= 2);
    for (const run of runsOf(pairValues, MIN_PAIR_STRAIGHT)) {
      for (let length = MIN_PAIR_STRAIGHT; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          add(run.slice(start, start + length).flatMap((value) => pick(groups, value, 2)));
        }
      }
    }
  }
  if (wants("plane") || wants("plane_single") || wants("plane_pair")) {
    const coreValues = values.filter((value) => groups.get(value).length === 3);
    for (const run of runsOf(coreValues, MIN_PLANE)) {
      for (let length = MIN_PLANE; length <= run.length; length += 1) {
        for (let start = 0; start + length <= run.length; start += 1) {
          const slice = run.slice(start, start + length);
          const core = slice.flatMap((value) => pick(groups, value, 3));
          if (wants("plane")) add(core);
          if (wants("plane_single")) addWithWings(core, weakestWings(groups, slice, length, 1, values));
          if (wants("plane_pair")) addWithWings(core, weakestWings(groups, slice, length, 2, values));
        }
      }
    }
  }
  if (wants("four_two") || wants("four_two_pairs")) {
    for (const value of values) {
      if (groups.get(value).length !== 4) continue;
      const core = pick(groups, value, 4);
      if (wants("four_two")) addWithWings(core, weakestWings(groups, [value], 2, 1, values));
      if (wants("four_two_pairs")) addWithWings(core, weakestWings(groups, [value], 2, 2, values));
    }
  }
  return out;
}
function enumerateBeats(handIds = [], target, { limit = 400 } = {}) {
  if (!target) return enumerateMoves(handIds, { limit });
  const types = target.type === "bomb" ? ["bomb", "rocket"] : [target.type, "bomb", "rocket"];
  return enumerateMoves(handIds, { limit, types }).filter((candidate) => canBeat(candidate.move, target));
}
function handPlan(handIds = []) {
  return memoized(PLAN_CACHE, cacheKey(handIds, "plan"), () => planHand(handIds));
}
function planHand(handIds) {
  const moves = [];
  let rest = [...handIds];
  let guard = 0;
  while (rest.length && guard < 40) {
    guard += 1;
    const candidates = enumerateMoves(rest, { types: PLAN_ORDER });
    if (!candidates.length) break;
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const score = (PLAN_BONUS[candidate.move.type] ?? 0) + candidate.move.size;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    moves.push(best.move);
    rest = removeCards(rest, best.cardIds);
  }
  return { moves, count: moves.length, leftover: rest };
}
var PLAN_ORDER = [
  "plane_pair",
  "plane_single",
  "plane",
  "straight",
  "pair_straight",
  "four_two_pairs",
  "four_two",
  "triple_pair",
  "triple_single",
  "triple",
  "pair",
  "single",
  "bomb",
  "rocket"
];
var PLAN_BONUS = {
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
  rocket: 22
};
function movesToEmpty(handIds = []) {
  return handPlan(handIds).count;
}
function beatableFromOutstanding(shape, outstanding) {
  if (!shape) return true;
  if (shape.type === "rocket") return false;
  const values = [...outstanding.keys()].sort((left, right) => left - right);
  if (values.includes(BIG_JOKER) && values.includes(SMALL_JOKER)) return true;
  if (shape.type !== "bomb" && values.some((value) => (outstanding.get(value) || 0) === 4)) return true;
  const higher = values.filter((value) => value > shape.mainValue);
  const countAt = (value) => outstanding.get(value) || 0;
  switch (shape.type) {
    case "single":
      return higher.some((value) => countAt(value) >= 1);
    case "pair":
      return higher.some((value) => countAt(value) >= 2);
    case "triple":
      return higher.some((value) => countAt(value) >= 3);
    case "bomb":
      return higher.some((value) => countAt(value) === 4);
    case "triple_single":
    case "triple_pair":
      return higher.some((value) => countAt(value) >= 3);
    case "four_two":
    case "four_two_pairs":
      return false;
    case "straight":
    case "pair_straight":
    case "plane":
    case "plane_single":
    case "plane_pair": {
      const per = shape.type === "pair_straight" || shape.type === "plane_pair" ? 2 : shape.type === "straight" ? 1 : 3;
      const length = shape.sequenceLength;
      const top = shape.mainValue - length + 1;
      for (let start = top + 1; start + length - 1 <= MAX_SEQUENCE_VALUE; start += 1) {
        let ok2 = true;
        for (let step = 0; step < length; step += 1) {
          if (countAt(start + step) < per) {
            ok2 = false;
            break;
          }
        }
        if (ok2) return true;
      }
      return false;
    }
    default:
      return true;
  }
}
function groupByValue(handIds) {
  const groups = /* @__PURE__ */ new Map();
  for (const id of handIds) {
    const card = cardFromId(id);
    if (!card) continue;
    const list = groups.get(card.value);
    if (list) list.push(id);
    else groups.set(card.value, [id]);
  }
  for (const list of groups.values()) {
    list.sort((left, right) => SUITS.indexOf(cardFromId(left).suit) - SUITS.indexOf(cardFromId(right).suit));
  }
  return groups;
}
function pick(groups, value, count) {
  const list = groups.get(value);
  return list && list.length >= count ? list.slice(0, count) : null;
}
function weakestWings(groups, exclude, total, per, values) {
  const skip = new Set(exclude);
  const pool = values.filter((value) => !skip.has(value));
  if (per === 1) {
    const wings2 = [];
    for (const value of pool) {
      wings2.push(groups.get(value)[0]);
      if (wings2.length === total) return wings2;
    }
    for (const value of pool) {
      for (const id of groups.get(value).slice(1)) {
        wings2.push(id);
        if (wings2.length === total) return wings2;
      }
    }
    return null;
  }
  const wings = [];
  for (const value of pool) {
    if ((groups.get(value)?.length ?? 0) < per) continue;
    wings.push(...pick(groups, value, per));
    if (wings.length >= total * per) return wings;
  }
  return null;
}
function runsOf(values, minLength) {
  const sorted = [...values].filter((value) => value <= MAX_SEQUENCE_VALUE).sort((left, right) => left - right);
  const runs = [];
  let start = 0;
  for (let index = 1; index <= sorted.length; index += 1) {
    const broken = index === sorted.length || sorted[index] !== sorted[index - 1] + 1;
    if (!broken) continue;
    const run = sorted.slice(start, index);
    start = index;
    if (run.length >= minLength) runs.push(run);
  }
  return runs;
}

// src/game.js
var PHASES = {
  LOBBY: "lobby",
  BIDDING: "bidding",
  REDEAL: "redeal",
  PLAYING: "playing",
  FINISHED: "finished"
};
var HAND_SIZE = 17;
var BOTTOM_SIZE = 3;
var LANDLORD_HAND_SIZE = HAND_SIZE + BOTTOM_SIZE;
var BID_SCORES = [0, 1, 2, 3];
function ok(state, extra = {}) {
  return { ok: true, state, ...extra };
}
function fail(error) {
  return { ok: false, state: null, error };
}
function createGame(names = ["\u73A9\u5BB6\u4E00", "\u73A9\u5BB6\u4E8C", "\u73A9\u5BB6\u4E09"]) {
  return {
    phase: PHASES.LOBBY,
    handNo: 0,
    dealerSeat: 0,
    landlordSeat: null,
    bottom: [],
    bottomRevealed: false,
    players: Array.from({ length: SEAT_COUNT }, (_, seat) => ({
      seat,
      name: String(names[seat] ?? `\u5EA7\u4F4D ${seat + 1}`),
      hand: []
    })),
    bids: [],
    bidTurn: 0,
    toAct: null,
    lastPlay: null,
    passes: 0,
    plays: [],
    finishedSeat: null,
    winnerSide: null,
    handsWon: { landlord: 0, farmers: 0 }
  };
}
function startHand(state, { rng, countHand = true } = {}) {
  if (![PHASES.LOBBY, PHASES.REDEAL, PHASES.FINISHED].includes(state.phase)) {
    return fail("\u724C\u5C40\u8FDB\u884C\u4E2D\uFF0C\u4E0D\u80FD\u91CD\u65B0\u53D1\u724C");
  }
  const deck = shuffleDeck(createDeck(), rng);
  const ids = deck.map((card) => card.id);
  const hands = Array.from(
    { length: SEAT_COUNT },
    (_, seat) => sortCardIds(ids.slice(seat * HAND_SIZE, (seat + 1) * HAND_SIZE))
  );
  const bottom = sortCardIds(ids.slice(HAND_SIZE * SEAT_COUNT));
  return ok({
    ...state,
    phase: PHASES.BIDDING,
    handNo: state.handNo + (countHand ? 1 : 0),
    landlordSeat: null,
    bottom,
    bottomRevealed: false,
    players: state.players.map((player) => ({ ...player, hand: hands[player.seat] })),
    bids: [],
    bidTurn: 0,
    toAct: null,
    lastPlay: null,
    passes: 0,
    plays: [],
    finishedSeat: null,
    winnerSide: null
  });
}
function bidSeat(state) {
  if (state.phase !== PHASES.BIDDING) return null;
  const order = seatOrderFrom(state.dealerSeat);
  return state.bidTurn < order.length ? order[state.bidTurn] : null;
}
function highestBid(state) {
  let best = { seat: null, score: 0 };
  for (const bid of state.bids) {
    if (bid.score > best.score) best = { seat: bid.seat, score: bid.score };
  }
  return best;
}
function beginPlay(state, landlordSeat) {
  return {
    ...state,
    phase: PHASES.PLAYING,
    landlordSeat,
    bottomRevealed: true,
    players: state.players.map(
      (player) => player.seat === landlordSeat ? { ...player, hand: sortCardIds([...player.hand, ...state.bottom]) } : player
    ),
    toAct: landlordSeat,
    lastPlay: null,
    passes: 0,
    plays: []
  };
}
function placeBid(state, seat, score) {
  if (state.phase !== PHASES.BIDDING) return fail("\u5F53\u524D\u4E0D\u662F\u53EB\u5206\u9636\u6BB5");
  const expected = bidSeat(state);
  if (seat !== expected) return fail(`\u8BE5 ${expected} \u53F7\u5EA7\u4F4D\u53EB\u5206`);
  const value = Number(score);
  if (!BID_SCORES.includes(value)) return fail("\u53EB\u5206\u53EA\u80FD\u662F 0\u30011\u30012\u30013");
  const best = highestBid(state);
  if (value > 0 && value <= best.score) return fail(`\u5FC5\u987B\u53EB\u5F97\u6BD4 ${best.score} \u5206\u66F4\u9AD8\uFF0C\u6216\u8005\u4E0D\u53EB`);
  const bids = [...state.bids, { seat, score: value, label: BID_LABELS[value] }];
  const bestAfter = value > best.score ? { seat, score: value } : best;
  if (value === 3) return ok(beginPlay({ ...state, bids, bidTurn: state.bidTurn + 1 }, seat));
  const bidTurn = state.bidTurn + 1;
  if (bidTurn < SEAT_COUNT) return ok({ ...state, bids, bidTurn });
  if (bestAfter.score === 0) {
    return ok({ ...state, bids, bidTurn, phase: PHASES.REDEAL }, { redeal: true });
  }
  return ok(beginPlay({ ...state, bids, bidTurn }, bestAfter.seat));
}
function checkPlay(state, seat, cardIds) {
  if (state.phase !== PHASES.PLAYING) return { ok: false, error: "\u5F53\u524D\u4E0D\u662F\u51FA\u724C\u9636\u6BB5" };
  if (seat !== state.toAct) return { ok: false, error: `\u8BE5 ${state.toAct} \u53F7\u5EA7\u4F4D\u51FA\u724C` };
  const player = state.players[seat];
  const ids = Array.isArray(cardIds) ? cardIds.map((id) => String(id)) : [];
  if (!ids.length) return { ok: false, error: "\u8BF7\u5148\u9009\u724C" };
  if (!cardsBelongToHand(ids, player.hand)) return { ok: false, error: "\u8FD9\u4E9B\u724C\u4E0D\u5728\u4F60\u624B\u91CC" };
  const move2 = classifyMove(ids);
  if (!move2) return { ok: false, error: "\u4E0D\u662F\u5408\u6CD5\u724C\u578B" };
  if (state.lastPlay && !canBeat(move2, state.lastPlay.move)) {
    return { ok: false, error: `\u538B\u4E0D\u8FC7\u4E0A\u5BB6\u7684${state.lastPlay.move.label}\uFF0C\u53EA\u80FD\u9009\u62E9\u4E0D\u51FA`, move: move2 };
  }
  return { ok: true, move: move2 };
}
function finish(state, seat) {
  const side = winnerSide(seat, state.landlordSeat);
  return {
    ...state,
    phase: PHASES.FINISHED,
    finishedSeat: seat,
    winnerSide: side,
    toAct: null,
    handsWon: { ...state.handsWon, [side]: state.handsWon[side] + 1 }
  };
}
function playCards(state, seat, cardIds) {
  const check = checkPlay(state, seat, cardIds);
  if (!check.ok) return fail(check.error);
  const ids = sortCardIds(cardIds.map((id) => String(id)));
  const players = state.players.map(
    (player) => player.seat === seat ? { ...player, hand: sortCardIds(removeCards(player.hand, ids)) } : player
  );
  const play2 = { seat, cards: ids, move: check.move };
  const base = {
    ...state,
    players,
    plays: [...state.plays, play2],
    lastPlay: { seat, cards: ids, move: check.move },
    passes: 0
  };
  if (players[seat].hand.length === 0) return ok(finish(base, seat));
  return ok({ ...base, toAct: nextSeat(seat) });
}
function canPass(state, seat = state.toAct) {
  return state.phase === PHASES.PLAYING && seat === state.toAct && Boolean(state.lastPlay);
}
function passTurn(state, seat) {
  if (state.phase !== PHASES.PLAYING) return fail("\u5F53\u524D\u4E0D\u662F\u51FA\u724C\u9636\u6BB5");
  if (seat !== state.toAct) return fail(`\u8BE5 ${state.toAct} \u53F7\u5EA7\u4F4D\u51FA\u724C`);
  if (!state.lastPlay) return fail("\u4F60\u662F\u5148\u624B\uFF0C\u5FC5\u987B\u51FA\u724C\uFF0C\u4E0D\u80FD\u4E0D\u51FA");
  const passes = state.passes + 1;
  if (passes >= SEAT_COUNT - 1) {
    return ok({ ...state, passes: 0, lastPlay: null, toAct: state.lastPlay.seat });
  }
  return ok({ ...state, passes, toAct: nextSeat(seat) });
}
function nextHand(state, options = {}) {
  if (state.phase !== PHASES.FINISHED) return fail("\u672C\u5C40\u8FD8\u6CA1\u7ED3\u675F");
  return startHand({ ...state, dealerSeat: nextSeat(state.dealerSeat) }, options);
}

// src/ui-logic.js
var BOT_LEVELS = ["easy", "medium", "hard", "hell"];
var BOT_LABELS = { easy: "\u7B80\u5355", medium: "\u4E2D\u7B49", hard: "\u56F0\u96BE", hell: "\u5730\u72F1" };
var DEFAULT_BOT_LEVEL = "medium";
function isBotLevel(value) {
  return BOT_LEVELS.includes(String(value ?? ""));
}
function botSeatLabel(level) {
  return isBotLevel(level) ? `\u7535\u8111\xB7${BOT_LABELS[level]}` : "\u7535\u8111";
}

// src/bot.js
var BOT_DELAY_MS = 700;
var PASS = { type: "pass" };
var DANGER_AT = {
  easy: 1,
  medium: 2,
  hard: 2,
  // Swept 2/3/4/5: 3 and 4 measured *worse* than 2 for 地狱, so this is not a
  // dial that makes the top level stronger — its edge is elsewhere.
  hell: 2
};
var BID_TABLES = {
  easy: [18, 12, 12],
  medium: [9, 13, 18],
  hard: [7, 11, 15],
  hell: [5, 9, 13]
};
function play(cardIds) {
  return { type: "play", cards: [...cardIds] };
}
function chooseAction(view, { rand = Math.random } = {}) {
  if (!view || typeof view.seat !== "number") return null;
  const level = isBotLevel(view.difficulty) ? view.difficulty : DEFAULT_BOT_LEVEL;
  const seatView = { ...view, difficulty: level };
  if (view.phase === PHASES.BIDDING && view.bidTurnSeat === view.seat) return chooseBid(seatView, rand);
  if (view.phase === PHASES.PLAYING && view.toAct === view.seat) return choosePlay(seatView, rand);
  return null;
}
function bidPower(handIds = []) {
  let power = 0;
  if (hasRocket(handIds)) power += 6;
  power += countBombs(handIds) * 4;
  for (const id of handIds) {
    const value = cardFromId(id)?.value ?? 0;
    if (value >= 16) power += 3;
    else if (value === 15) power += 2;
    else if (value === 14) power += 1;
  }
  power += Math.max(0, 10 - movesToEmpty(handIds));
  return power;
}
function legalBid(want, best = 0) {
  const target = Math.max(0, Math.min(3, Math.round(Number(want) || 0)));
  if (target <= best) return 0;
  return target;
}
function chooseBid(view, rand) {
  const power = bidPower(view.hand);
  const best = view.highestBid?.score ?? 0;
  const table = BID_TABLES[view.difficulty] ?? BID_TABLES.medium;
  if (view.difficulty === "easy") {
    const want2 = power >= table[2] ? 2 : power >= table[0] ? 1 : 0;
    return { type: "bid", score: rand() < 0.25 ? 0 : legalBid(want2, best) };
  }
  const want = power >= table[2] ? 3 : power >= table[1] ? 2 : power >= table[0] ? 1 : 0;
  return { type: "bid", score: legalBid(want, best) };
}
function outstandingFor(view) {
  const counts = /* @__PURE__ */ new Map();
  for (const id of deckIds()) {
    const value = cardFromId(id)?.value;
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  for (const id of [...view.hand, ...view.playedIds]) {
    const value = cardFromId(id)?.value;
    if (!value) continue;
    counts.set(value, Math.max(0, (counts.get(value) || 0) - 1));
  }
  for (const [value, count] of [...counts.entries()]) if (count <= 0) counts.delete(value);
  return counts;
}
function teammateOf(view) {
  if (view.role !== "farmer") return null;
  return view.handCounts.find((entry) => entry.seat !== view.seat && entry.role === "farmer") ?? null;
}
function opponentsOf(view) {
  return view.handCounts.filter((entry) => entry.seat !== view.seat && entry.role !== view.role);
}
function inDanger(view) {
  const limit = DANGER_AT[view.difficulty] ?? DANGER_AT.medium;
  return opponentsOf(view).filter((entry) => entry.count <= limit);
}
function isBomb(candidate) {
  return Boolean(candidate.move.isBomb || candidate.move.isRocket);
}
function legalMoves(view) {
  return view.target ? enumerateBeats(view.hand, view.target) : enumerateMoves(view.hand);
}
function byCheapest(left, right) {
  return left.move.mainValue - right.move.mainValue || right.move.size - left.move.size;
}
function cheapest(moves) {
  return [...moves].sort(byCheapest)[0] ?? null;
}
function pickIndex(list, rand) {
  return Math.min(list.length - 1, Math.floor(rand() * list.length));
}
function cheapestWithoutBreaking(handIds, moves) {
  return [...moves].sort(
    (left, right) => movesToEmpty(removeCards(handIds, left.cardIds)) - movesToEmpty(removeCards(handIds, right.cardIds)) || left.move.mainValue - right.move.mainValue
  )[0];
}
function runOutLine(handIds, outstanding) {
  let rest = [...handIds];
  const moves = [];
  let guard = 0;
  while (rest.length && guard < 20) {
    guard += 1;
    const safe = enumerateMoves(rest).filter((candidate) => !beatableFromOutstanding(candidate.move, outstanding));
    if (!safe.length) break;
    safe.sort((left, right) => right.move.size - left.move.size || left.move.mainValue - right.move.mainValue);
    const chosen = safe[0];
    moves.push(chosen.move);
    rest = removeCards(rest, chosen.cardIds);
  }
  return { moves, cards: handIds.length - rest.length, out: rest.length === 0 };
}
function choosePlay(view, rand) {
  if (!view.hand.length) return null;
  const moves = legalMoves(view);
  if (!moves.length) return view.canPass ? PASS : null;
  if (view.difficulty === "easy") return easyPlay(view, moves, rand);
  const outstanding = outstandingFor(view);
  const mate = teammateOf(view);
  const danger = inDanger(view);
  const plain = moves.filter((candidate) => !isBomb(candidate));
  const winning = moves.filter((candidate) => removeCards(view.hand, candidate.cardIds).length === 0);
  if (winning.length) return play(cheapest(winning).cardIds);
  if (danger.length) {
    const stopper = view.difficulty === "medium" ? cheapest(plain.length ? plain : moves) : cheapestWithoutBreaking(view.hand, plain.length ? plain : moves);
    if (view.difficulty === "hell") {
      if (stopper && !beatableFromOutstanding(stopper.move, outstanding)) return play(stopper.cardIds);
      const unanswerable = moves.filter((candidate) => !beatableFromOutstanding(candidate.move, outstanding));
      if (unanswerable.length) return play(cheapest(unanswerable).cardIds);
    }
    if (stopper) return play(stopper.cardIds);
  }
  if (mate && view.targetSeat === mate.seat) {
    if (mate.count <= 3) return view.canPass ? PASS : play(cheapest(moves).cardIds);
    if (movesToEmpty(view.hand) > 2) return view.canPass ? PASS : play(cheapest(moves).cardIds);
  }
  if (view.target) {
    if (plain.length) {
      if (view.difficulty === "medium") return play(cheapest(plain).cardIds);
      return play(cheapestWithoutBreaking(view.hand, plain).cardIds);
    }
    return view.canPass ? PASS : play(cheapest(moves).cardIds);
  }
  if (view.difficulty === "medium") return play(cheapest(moves).cardIds);
  return play(chooseLead(view, moves, outstanding).cardIds);
}
function easyPlay(view, moves, rand) {
  if (view.canPass && rand() < 0.15) return PASS;
  if (rand() < 0.4) return play(moves[pickIndex(moves, rand)].cardIds);
  return play(cheapest(moves).cardIds);
}
function chooseLead(view, moves, outstanding) {
  const remaining = moves.map((candidate) => ({
    candidate,
    after: removeCards(view.hand, candidate.cardIds)
  }));
  const planOf = (entry) => movesToEmpty(entry.after);
  if (view.difficulty === "hell") {
    const finishing = remaining.filter(
      (entry) => entry.after.length <= 10 && runOutLine(entry.after, outstanding).out
    );
    if (finishing.length) {
      return [...finishing].sort(
        (left, right) => movesToEmpty(left.after) - movesToEmpty(right.after) || right.candidate.move.size - left.candidate.move.size
      )[0].candidate;
    }
  }
  const safe = view.role === "landlord" ? remaining.filter((entry) => entry.candidate.move.mainValue < 15) : remaining;
  const pool = safe.length ? safe : remaining;
  return [...pool].sort(
    (left, right) => planOf(left) - planOf(right) || right.candidate.move.size - left.candidate.move.size || left.candidate.move.mainValue - right.candidate.move.mainValue
  )[0].candidate;
}

// src/room.js
import { randomBytes, randomInt } from "node:crypto";

// src/rng.js
var CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode(length = 6, rng = null) {
  const draw = rng || ((max) => Math.floor(Math.random() * max));
  let out = "";
  for (let index = 0; index < length; index += 1) out += CODE_ALPHABET[draw(CODE_ALPHABET.length)];
  return out;
}

// src/room.js
var PROTOCOL = 1;
var MAX_NAME = 12;
var LOG_TAIL = 20;
function cleanName(name2, seat) {
  const text = String(name2 ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const capped = [...text].slice(0, MAX_NAME).join("");
  return capped || `\u73A9\u5BB6${seat + 1}`;
}
function notify(room) {
  if (!room.waiters.size) return;
  const waiters = [...room.waiters];
  room.waiters.clear();
  for (const waiter of waiters) {
    try {
      waiter();
    } catch {
    }
  }
}
function bump(room, note) {
  room.seq += 1;
  if (note) {
    room.log.push({ seq: room.seq, at: Date.now(), note });
    if (room.log.length > 200) room.log.splice(0, room.log.length - 200);
  }
  notify(room);
}
function seatNames(room) {
  return room.seats.map((seat, index) => seat?.name ?? `\u73A9\u5BB6${index + 1}`);
}
function displayName(room, seat) {
  return room.seats[seat]?.name ?? room.game.players[seat]?.name ?? `\u73A9\u5BB6${seat + 1}`;
}
function syncNames(room) {
  const names = seatNames(room);
  room.game = { ...room.game, players: room.game.players.map((p) => ({ ...p, name: names[p.seat] })) };
}
function midHand(room) {
  return room.game.phase === PHASES.BIDDING || room.game.phase === PHASES.PLAYING;
}
function botSeats(room) {
  return room.seats.filter((seat) => Boolean(seat?.bot));
}
function makeBotSeat(seat, level) {
  return {
    seat,
    name: botSeatLabel(level),
    // No token: `seatForToken` never matches a bot, so a computer can never be
    // addressed as a human and a human can never inherit a computer's seat.
    token: null,
    connected: true,
    joinedAt: Date.now(),
    bot: level
  };
}
function deal(room, { countHand = true } = {}) {
  const result = startHand(room.game, { rng: room.rng, countHand });
  if (!result.ok) return false;
  room.game = result.state;
  return true;
}
function maybeStart(room) {
  if (room.game.phase !== PHASES.LOBBY) return false;
  if (room.seats.some((seat) => seat === null)) return false;
  syncNames(room);
  return deal(room);
}
function cryptoRng(max) {
  return randomInt(max);
}
function createRoom({ code = randomCode(6), name: name2 = "\u6597\u5730\u4E3B\u623F\u95F4", rng = cryptoRng } = {}) {
  return {
    code: String(code).toUpperCase(),
    name: String(name2),
    protocol: PROTOCOL,
    seats: Array.from({ length: SEAT_COUNT }, () => null),
    game: createGame(),
    seq: 1,
    redeals: 0,
    log: [],
    rng,
    waiters: /* @__PURE__ */ new Set(),
    createdAt: Date.now(),
    /** The seat that owns the room's setup; the first human to sit down. */
    hostSeat: null,
    /** Strength applied to new and existing computer seats. */
    botLevel: DEFAULT_BOT_LEVEL
  };
}
function seatForToken(room, token) {
  if (!token) return null;
  const index = room.seats.findIndex((seat) => seat && seat.token === token);
  return index === -1 ? null : index;
}
function roomInfo(room) {
  return {
    ok: true,
    protocol: PROTOCOL,
    code: room.code,
    name: room.name,
    phase: room.game.phase,
    handNo: room.game.handNo,
    seatsTaken: room.seats.filter(Boolean).length,
    free: room.seats.filter((seat) => seat === null).length,
    humans: room.seats.filter((seat) => seat && !seat.bot).length,
    bots: botSeats(room).length,
    botLevel: room.botLevel,
    seats: room.seats.map((seat, index) => ({
      seat: index,
      occupied: Boolean(seat),
      connected: Boolean(seat?.connected),
      name: seat?.name ?? null,
      bot: seat?.bot ?? null
    }))
  };
}
function joinSeat(room, { name: name2, token, code } = {}) {
  if (code !== void 0 && code !== null && String(code).toUpperCase() !== room.code) {
    return { ok: false, error: "\u623F\u95F4\u7801\u4E0D\u5BF9", reason: "bad-code" };
  }
  if (token) {
    const existing = seatForToken(room, token);
    if (existing === null) return { ok: false, error: "\u8EAB\u4EFD\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u5165\u5EA7", reason: "stale-token" };
    const seat = room.seats[existing];
    if (name2) seat.name = cleanName(name2, existing);
    seat.connected = true;
    syncNames(room);
    bump(room, `${seat.name} \u91CD\u65B0\u8FDE\u63A5`);
    return { ok: true, seat: existing, token, rejoin: true };
  }
  let free = room.seats.findIndex((seat) => seat === null);
  if (free === -1) {
    const botAt = room.seats.reduce((found, seat, index) => seat?.bot ? index : found, -1);
    if (botAt >= 0 && !midHand(room)) {
      room.seats[botAt] = null;
      bump(room, "\u7535\u8111\u8BA9\u4F4D");
      free = botAt;
    }
    if (free === -1) {
      return {
        ok: false,
        error: midHand(room) ? "\u623F\u95F4\u5DF2\u6EE1\uFF0C\u724C\u5C40\u8FDB\u884C\u4E2D\u4E0D\u80FD\u6362\u4EBA" : "\u623F\u95F4\u5DF2\u6EE1\uFF08\u4E09\u4EBA\uFF09",
        reason: "full"
      };
    }
  }
  const issued = randomBytes(24).toString("hex");
  room.seats[free] = { seat: free, name: cleanName(name2, free), token: issued, connected: true, joinedAt: Date.now() };
  if (room.hostSeat === null) room.hostSeat = free;
  const started = maybeStart(room);
  bump(room, `${room.seats[free].name} \u5165\u5EA7${started ? "\uFF0C\u5F00\u5C40" : ""}`);
  return { ok: true, seat: free, token: issued, rejoin: false, started };
}
function setConnected(room, token, connected) {
  const seat = seatForToken(room, token);
  if (seat === null) return { ok: false, error: "\u8EAB\u4EFD\u65E0\u6548" };
  const current = room.seats[seat];
  if (current.connected === Boolean(connected)) return { ok: true, seat, unchanged: true };
  current.connected = Boolean(connected);
  bump(room, `${current.name} ${connected ? "\u5DF2\u8FDE\u63A5" : "\u65AD\u5F00\u8FDE\u63A5"}`);
  return { ok: true, seat };
}
function setBots(room, seat, action) {
  if (room.hostSeat !== null && seat !== room.hostSeat) return { ok: false, error: "\u53EA\u6709\u623F\u4E3B\u80FD\u5B89\u6392\u7535\u8111" };
  const level = isBotLevel(action.level) ? String(action.level) : room.botLevel;
  const current = botSeats(room).length;
  const humans = room.seats.filter((entry) => entry && !entry.bot).length;
  const wantsCount = action.count !== void 0 && action.count !== null;
  const wanted = wantsCount ? Math.max(0, Math.min(SEAT_COUNT - humans, Math.round(Number(action.count) || 0))) : current;
  if (wanted !== current && midHand(room)) {
    return { ok: false, error: "\u724C\u5C40\u8FDB\u884C\u4E2D\uFF0C\u7B49\u8FD9\u5C40\u7ED3\u675F\u518D\u6539\u7535\u8111\u6570\u91CF\uFF08\u5F3A\u5EA6\u53EF\u4EE5\u968F\u65F6\u6362\uFF09" };
  }
  room.botLevel = level;
  for (const entry of room.seats) {
    if (!entry?.bot) continue;
    entry.bot = level;
    entry.name = botSeatLabel(level);
  }
  let added = 0;
  let removed = 0;
  if (wanted > current) {
    for (let index = SEAT_COUNT - 1; index >= 0 && added < wanted - current; index -= 1) {
      if (room.seats[index] === null) {
        room.seats[index] = makeBotSeat(index, level);
        added += 1;
      }
    }
  } else if (wanted < current) {
    for (let index = SEAT_COUNT - 1; index >= 0 && removed < current - wanted; index -= 1) {
      if (room.seats[index]?.bot) {
        room.seats[index] = null;
        removed += 1;
      }
    }
  }
  syncNames(room);
  const started = maybeStart(room);
  const bots = botSeats(room).length;
  const note = [
    added ? `\u52A0\u5165 ${added} \u4E2A\u7535\u8111` : "",
    removed ? `\u64A4\u4E0B ${removed} \u4E2A\u7535\u8111` : "",
    !added && !removed && wantsCount ? `\u7535\u8111\u6570\u91CF\u5DF2\u662F ${bots}` : "",
    !wantsCount ? `\u7535\u8111\u5F3A\u5EA6\u6539\u4E3A${botSeatLabel(level).replace("\u7535\u8111\xB7", "")}` : "",
    started ? "\uFF0C\u5F00\u5C40" : ""
  ].filter(Boolean).join("");
  bump(room, note ? `${note}` : null);
  return { ok: true, seat, level, bots, added, removed, started };
}
function applyAction(room, seat, action) {
  const type = String(action?.type ?? "");
  const game = room.game;
  if (type === "start") {
    if (game.phase !== PHASES.LOBBY) return { ok: false, error: "\u5DF2\u7ECF\u5F00\u5C40" };
    if (room.seats.some((s) => s === null)) return { ok: false, error: "\u8981\u4E09\u4E2A\u4EBA\u90FD\u5230\u9F50\u624D\u80FD\u5F00\u5C40\uFF08\u53EF\u4EE5\u7528\u7535\u8111\u8865\u9F50\uFF09" };
    syncNames(room);
    if (!deal(room)) return { ok: false, error: "\u53D1\u724C\u5931\u8D25" };
    bump(room, "\u5F00\u5C40");
    return { ok: true, seat };
  }
  if (type === "bots") return setBots(room, seat, action);
  if (type === "next") {
    const result = nextHand(game, { rng: room.rng });
    if (!result.ok) return { ok: false, error: result.error };
    room.game = result.state;
    bump(room, `\u7B2C ${result.state.handNo} \u5C40\u5F00\u59CB`);
    return { ok: true, seat };
  }
  if (type === "bid") {
    const result = placeBid(game, seat, action.score);
    if (!result.ok) return { ok: false, error: result.error };
    room.game = result.state;
    if (result.redeal) {
      room.redeals += 1;
      deal(room, { countHand: false });
      bump(room, "\u4E09\u5BB6\u90FD\u4E0D\u53EB\uFF0C\u91CD\u65B0\u53D1\u724C");
    } else {
      bump(room, null);
    }
    return { ok: true, seat };
  }
  if (type === "play") {
    const result = playCards(game, seat, action.cards);
    if (!result.ok) return { ok: false, error: result.error };
    room.game = result.state;
    bump(room, null);
    return { ok: true, seat };
  }
  if (type === "pass") {
    const result = passTurn(game, seat);
    if (!result.ok) return { ok: false, error: result.error };
    room.game = result.state;
    bump(room, null);
    return { ok: true, seat };
  }
  return { ok: false, error: `\u672A\u77E5\u64CD\u4F5C\uFF1A${type || "(\u7A7A)"}` };
}
function act(room, token, action) {
  const seat = seatForToken(room, token);
  if (seat === null) return { ok: false, error: "\u8EAB\u4EFD\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u5165\u5EA7", reason: "unauthorized" };
  return applyAction(room, seat, action);
}
function botView(room, seat) {
  const game = room.game;
  const player = game.players[seat];
  if (!player) return null;
  return {
    difficulty: room.seats[seat]?.bot ?? room.botLevel,
    seat,
    phase: game.phase,
    role: roleOf(game, seat),
    hand: [...player.hand],
    handCounts: game.players.map((entry) => ({
      seat: entry.seat,
      count: entry.hand.length,
      role: roleOf(game, entry.seat),
      isBot: Boolean(room.seats[entry.seat]?.bot)
    })),
    playedIds: game.plays.flatMap((play2) => play2.cards),
    landlordSeat: game.landlordSeat,
    dealerSeat: game.dealerSeat,
    toAct: game.toAct,
    target: game.lastPlay ? { ...game.lastPlay.move } : null,
    targetSeat: game.lastPlay?.seat ?? null,
    passes: game.passes,
    canPass: canPass(game, seat),
    bidTurnSeat: bidSeat(game),
    highestBid: highestBid(game)
  };
}
function botTurnSeat(room) {
  const game = room.game;
  let seat = null;
  if (game.phase === PHASES.BIDDING) seat = bidSeat(game);
  else if (game.phase === PHASES.PLAYING) seat = game.toAct;
  if (seat === null || seat === void 0) return null;
  return room.seats[seat]?.bot ? seat : null;
}
function fallbackAction(view) {
  const moves = view.target ? enumerateBeats(view.hand, view.target) : enumerateMoves(view.hand);
  if (moves.length) {
    const cheapest2 = [...moves].sort((left, right) => left.move.mainValue - right.move.mainValue)[0];
    return { type: "play", cards: cheapest2.cardIds };
  }
  if (view.canPass) return { type: "pass" };
  const lead = smallestLead(view.hand);
  return lead.length ? { type: "play", cards: lead } : null;
}
function forcedAction(view) {
  if (view.canPass) return { type: "pass" };
  const lead = smallestLead(view.hand);
  return lead.length ? { type: "play", cards: lead } : null;
}
function applyBotAction(room, seat, { rand = Math.random } = {}) {
  if (!room.seats[seat]?.bot) return { ok: false, error: "\u8FD9\u4E2A\u5EA7\u4F4D\u4E0D\u662F\u7535\u8111", action: null };
  const view = botView(room, seat);
  const chosen = chooseAction(view, { rand });
  let lastError = "";
  for (const action of [chosen, fallbackAction(view), forcedAction(view)]) {
    if (!action) continue;
    const result = applyAction(room, seat, action);
    if (result.ok) {
      if (action !== chosen) bump(room, `${room.seats[seat].name} \u8D70\u4E86\u4FDD\u5E95\u51FA\u6CD5`);
      return { ok: true, seat, action, fallback: action !== chosen };
    }
    lastError = result.error;
  }
  bump(room, `${displayName(room, seat)} \u51FA\u624B\u5931\u8D25\uFF1A${lastError || "\u6CA1\u6709\u5408\u6CD5\u51FA\u6CD5"}`);
  return { ok: false, error: lastError || "\u6CA1\u6709\u5408\u6CD5\u51FA\u6CD5", action: null };
}
function roleOf(game, seat) {
  if (game.landlordSeat === null) return null;
  return game.landlordSeat === seat ? "landlord" : "farmer";
}
function publicMove(move2) {
  if (!move2) return null;
  return {
    type: move2.type,
    label: move2.label,
    size: move2.size,
    mainValue: move2.mainValue,
    sequenceLength: move2.sequenceLength,
    isBomb: Boolean(move2.isBomb),
    isRocket: Boolean(move2.isRocket)
  };
}
function hintFor(room, seat) {
  const game = room.game;
  if (game.phase === PHASES.BIDDING) {
    return bidSeat(game) === seat ? "\u8F6E\u5230\u4F60\u53EB\u5206" : "\u7B49\u5F85\u5176\u4ED6\u73A9\u5BB6\u53EB\u5206";
  }
  if (game.phase === PHASES.PLAYING) {
    if (game.toAct !== seat) return `\u7B49\u5F85 ${game.players[game.toAct]?.name ?? ""} \u51FA\u724C`;
    if (!game.lastPlay) return "\u4F60\u5148\u624B\uFF0C\u5FC5\u987B\u51FA\u724C";
    return `\u51FA\u80FD\u538B\u8FC7\u300C${game.lastPlay.move.label}\u300D\u7684\u724C\uFF0C\u6216\u9009\u62E9\u4E0D\u51FA`;
  }
  if (game.phase === PHASES.FINISHED) {
    const seatName = game.finishedSeat === null ? "" : game.players[game.finishedSeat].name;
    return `${game.winnerSide === "landlord" ? "\u5730\u4E3B" : "\u519C\u6C11"}\u83B7\u80DC\uFF08${seatName} \u5148\u51FA\u5B8C\uFF09`;
  }
  if (game.phase === PHASES.REDEAL) return "\u4E09\u5BB6\u90FD\u4E0D\u53EB\uFF0C\u6B63\u5728\u91CD\u65B0\u53D1\u724C";
  const free = room.seats.filter((entry) => entry === null).length;
  if (free > 0) {
    return room.hostSeat === seat ? `\u8FD8\u5DEE ${free} \u4EBA\uFF1B\u4E5F\u53EF\u4EE5\u8BA9\u7535\u8111\u8865\u9F50` : `\u8FD8\u5DEE ${free} \u4EBA\uFF0C\u7B49\u623F\u4E3B\u5B89\u6392`;
  }
  return "\u51C6\u5907\u5F00\u59CB";
}
function snapshotFor(room, seat) {
  const game = room.game;
  const revealAll = game.phase === PHASES.FINISHED;
  const me = game.players[seat];
  const seats = game.players.map((player) => ({
    seat: player.seat,
    name: displayName(room, player.seat),
    occupied: Boolean(room.seats[player.seat]),
    connected: Boolean(room.seats[player.seat]?.connected),
    bot: room.seats[player.seat]?.bot ?? null,
    role: roleOf(game, player.seat),
    count: player.hand.length,
    isTurn: game.toAct === player.seat,
    isYou: player.seat === seat,
    bid: game.bids.find((bid) => bid.seat === player.seat)?.score ?? null,
    hasBid: game.bids.some((bid) => bid.seat === player.seat),
    // Null means "unknown to you"; the reveal at the end is deliberate.
    hand: player.seat === seat || revealAll ? [...player.hand] : null
  }));
  return {
    protocol: PROTOCOL,
    seq: room.seq,
    code: room.code,
    roomName: room.name,
    phase: game.phase,
    handNo: game.handNo,
    redeals: room.redeals,
    dealerSeat: game.dealerSeat,
    landlordSeat: game.landlordSeat,
    bottomRevealed: game.bottomRevealed,
    bottom: game.bottomRevealed ? [...game.bottom] : [],
    you: {
      seat,
      name: displayName(room, seat),
      role: roleOf(game, seat),
      hand: [...me.hand]
    },
    seats,
    bids: game.bids.map((bid) => ({ ...bid })),
    bidTurnSeat: bidSeat(game),
    toAct: game.toAct,
    lastPlay: game.lastPlay ? { seat: game.lastPlay.seat, cards: [...game.lastPlay.cards], move: publicMove(game.lastPlay.move) } : null,
    passes: game.passes,
    plays: game.plays.map((play2) => ({
      seat: play2.seat,
      cards: [...play2.cards],
      move: publicMove(play2.move)
    })),
    finishedSeat: game.finishedSeat,
    winnerSide: game.winnerSide,
    handsWon: { ...game.handsWon },
    secretsRevealed: revealAll,
    seatsTaken: room.seats.filter(Boolean).length,
    botLevel: room.botLevel,
    botsSeated: botSeats(room).length,
    hostSeat: room.hostSeat,
    // Strength is switchable at any time; the number of computers is not.
    isHost: room.hostSeat === seat,
    canSetBotLevel: room.hostSeat === seat,
    canSetBotCount: room.hostSeat === seat && !midHand(room),
    canAct: game.phase === PHASES.PLAYING && game.toAct === seat,
    canBid: game.phase === PHASES.BIDDING && bidSeat(game) === seat,
    canPass: canPass(game, seat),
    canStart: game.phase === PHASES.LOBBY && room.seats.every(Boolean),
    canNext: game.phase === PHASES.FINISHED,
    hint: hintFor(room, seat),
    log: room.log.slice(-LOG_TAIL).map((entry) => ({ seq: entry.seq, note: entry.note }))
  };
}
function waitForChange(room, since, timeoutMs = 2e4) {
  if (room.seq > since) return Promise.resolve({ changed: true, seq: room.seq });
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    function settle(changed) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      room.waiters.delete(waiter);
      resolve({ changed, seq: room.seq });
    }
    const waiter = () => settle(true);
    room.waiters.add(waiter);
    timer = setTimeout(() => settle(false), Math.max(0, Number(timeoutMs) || 0));
  });
}
function closeRoom(room) {
  notify(room);
  room.waiters.clear();
}

// src/net.js
var TOKEN_HEADER = "x-ddz-token";
var MAX_BODY = 64 * 1024;
var VIRTUAL_IFACE_HINTS = [
  "vethernet",
  "wsl",
  "hyper-v",
  "docker",
  "vmware",
  "virtualbox",
  "vbox",
  "loopback",
  "bluetooth",
  "tailscale",
  "zerotier",
  "npcap",
  "radmin",
  "hamachi",
  "openvpn",
  "wireguard",
  "tap-",
  "tun",
  "container",
  "bridge"
];
function isVirtualIface(name2) {
  const lower = String(name2 ?? "").toLowerCase();
  return VIRTUAL_IFACE_HINTS.some((hint) => lower.includes(hint));
}
function rankLanCandidates(interfaces = {}) {
  const out = [];
  for (const [iface, entries] of Object.entries(interfaces ?? {})) {
    for (const entry of entries ?? []) {
      if (!entry || entry.family !== "IPv4" || entry.internal) continue;
      const address = String(entry.address ?? "");
      if (!address || address.startsWith("169.254.")) continue;
      out.push({ address, iface, virtual: isVirtualIface(iface) });
    }
  }
  return out.sort((a, b) => a.virtual === b.virtual ? a.address.localeCompare(b.address) : a.virtual ? 1 : -1);
}
function lanAddresses() {
  return rankLanCandidates(networkInterfaces());
}
function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("\u8BF7\u6C42\u4F53\u8D85\u8FC7\u4E0A\u9650"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function safeJson(text) {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
function send(res, status, payload) {
  if (res.writableEnded || res.destroyed) return;
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store"
  });
  res.end(body);
}
function portIsBusy(port, host) {
  return new Promise((resolve) => {
    const target = host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
    const probe = net.connect({ port, host: target });
    let settled = false;
    const done = (busy) => {
      if (settled) return;
      settled = true;
      probe.destroy();
      resolve(busy);
    };
    probe.setTimeout(400);
    probe.once("connect", () => done(true));
    probe.once("timeout", () => done(false));
    probe.once("error", () => done(false));
  });
}
async function createAuthorityServer(room, { host = "0.0.0.0", port = 8791, pollTimeoutMs = 2e4, botDelayMs = BOT_DELAY_MS } = {}) {
  if (port && await portIsBusy(port, host)) throw new Error(`\u7AEF\u53E3 ${port} \u5DF2\u88AB\u5360\u7528`);
  let botTimer = null;
  let closed = false;
  const botRand = () => room.rng(4294967296) / 4294967296;
  function scheduleBot(delay2 = botDelayMs) {
    if (closed || botTimer) return;
    if (botTurnSeat(room) === null) return;
    botTimer = setTimeout(() => {
      botTimer = null;
      if (closed) return;
      const seat = botTurnSeat(room);
      if (seat !== null) applyBotAction(room, seat, { rand: botRand });
      scheduleBot();
    }, Math.max(0, delay2));
    botTimer.unref?.();
  }
  const server = http.createServer((req, res) => {
    handle(req, res, room, pollTimeoutMs).catch((error) => {
      send(res, 500, { ok: false, error: `\u670D\u52A1\u7AEF\u9519\u8BEF\uFF1A${error?.message ?? error}` });
    }).finally(() => scheduleBot());
  });
  const ready = new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      const bound = server.address();
      const actual = typeof bound === "object" && bound ? bound.port : port;
      const candidates = lanAddresses();
      const real = candidates.filter((entry) => !entry.virtual);
      const shareable = real.length ? real : candidates;
      scheduleBot();
      resolve({
        server,
        room,
        protocol: PROTOCOL,
        port: actual,
        code: room.code,
        url: `http://${host}:${actual}`,
        loopbackUrl: `http://127.0.0.1:${actual}`,
        lanUrls: shareable.map((entry) => `http://${entry.address}:${actual}`),
        lanCandidates: candidates.map((entry) => ({
          url: `http://${entry.address}:${actual}`,
          iface: entry.iface,
          virtual: entry.virtual
        })),
        address: bound,
        botDelayMs,
        close: () => {
          closed = true;
          if (botTimer) clearTimeout(botTimer);
          botTimer = null;
          return closeAuthority(server, room);
        }
      });
    });
  });
  return ready;
}
async function closeAuthority(server, room) {
  closeRoom(room);
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
}
async function handle(req, res, room, pollTimeoutMs) {
  const url = new URL(req.url ?? "/", "http://authority.local");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const token = req.headers[TOKEN_HEADER];
  const method = req.method ?? "GET";
  if (method === "GET" && (path === "/hello" || path === "/")) {
    send(res, 200, roomInfo(room));
    return;
  }
  if (method === "POST" && path === "/join") {
    const body = safeJson(await readBody(req));
    if (!body) {
      send(res, 400, { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" });
      return;
    }
    const result = joinSeat(room, { name: body.name, token: body.token, code: body.code });
    if (!result.ok) {
      send(res, result.reason === "bad-code" ? 403 : 409, result);
      return;
    }
    send(res, 200, {
      ok: true,
      seat: result.seat,
      token: result.token,
      rejoin: Boolean(result.rejoin),
      state: snapshotFor(room, result.seat)
    });
    return;
  }
  if (method === "GET" && path === "/state") {
    const seat = seatForToken(room, token);
    if (seat === null) {
      send(res, 401, { ok: false, error: "\u8EAB\u4EFD\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u5165\u5EA7", reason: "unauthorized" });
      return;
    }
    const since = Number(url.searchParams.get("since") ?? 0) || 0;
    const current = snapshotFor(room, seat);
    if (current.seq > since) {
      send(res, 200, { ok: true, changed: true, state: current });
      return;
    }
    const outcome = await waitForChange(room, since, pollTimeoutMs);
    const next = snapshotFor(room, seat);
    send(res, 200, { ok: true, changed: outcome.changed, state: next });
    return;
  }
  if (method === "POST" && (path === "/act" || path === "/leave")) {
    const seat = seatForToken(room, token);
    if (seat === null) {
      send(res, 401, { ok: false, error: "\u8EAB\u4EFD\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u5165\u5EA7", reason: "unauthorized" });
      return;
    }
    const body = safeJson(await readBody(req));
    if (!body && path === "/act") {
      send(res, 400, { ok: false, error: "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON" });
      return;
    }
    if (path === "/leave") {
      setConnected(room, token, false);
      send(res, 200, { ok: true, state: snapshotFor(room, seat) });
      return;
    }
    const result = act(room, token, body);
    if (!result.ok) {
      send(res, 200, { ok: false, error: result.error, state: snapshotFor(room, seat) });
      return;
    }
    send(res, 200, { ok: true, state: snapshotFor(room, result.seat) });
    return;
  }
  send(res, 404, { ok: false, error: `\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3\uFF1A${method} ${path}` });
}
function createFollowerLink({
  baseUrl,
  code,
  name: name2 = "\u73A9\u5BB6",
  token: initialToken = null,
  pollTimeoutMs = 2e4,
  fetchImpl = globalThis.fetch,
  onState,
  onError,
  onSeat
} = {}) {
  const base = String(baseUrl ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("\u7F3A\u5C11\u623F\u4E3B\u5730\u5740");
  if (typeof fetchImpl !== "function") throw new Error("\u7F3A\u5C11 fetch \u5B9E\u73B0");
  let token = initialToken;
  let seat = null;
  let latest = null;
  let stopped = false;
  let running = null;
  let controller = null;
  const waiters = /* @__PURE__ */ new Set();
  function publish(state) {
    if (!state) return;
    latest = state;
    try {
      onState?.(state);
    } catch {
    }
    for (const waiter of [...waiters]) {
      let matched = false;
      try {
        matched = Boolean(waiter(state));
      } catch {
        matched = true;
      }
      if (matched) waiters.delete(waiter);
    }
  }
  async function call(path, { method = "GET", body, signal } = {}) {
    const headers = {};
    if (token) headers[TOKEN_HEADER] = token;
    if (body !== void 0) headers["content-type"] = "application/json";
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers,
      body: body === void 0 ? void 0 : JSON.stringify(body),
      signal
    });
    const text = await response.text();
    const data = safeJson(text);
    if (!data) throw new Error(`\u54CD\u5E94\u4E0D\u662F JSON\uFF08HTTP ${response.status}\uFF09`);
    return { ...data, httpStatus: response.status };
  }
  async function join(overrides = {}) {
    const data = await call("/join", {
      method: "POST",
      body: { code, name: overrides.name ?? name2, token }
    });
    if (!data.ok) throw new Error(data.error ?? "\u5165\u5EA7\u5931\u8D25");
    token = data.token;
    seat = data.seat;
    onSeat?.(seat, token);
    publish(data.state);
    return data;
  }
  async function refresh({ signal } = {}) {
    const since = latest?.seq ?? 0;
    const timeout = signal || !pollTimeoutMs || typeof AbortSignal?.timeout !== "function" ? signal : AbortSignal.timeout(pollTimeoutMs + 5e3);
    const data = await call(`/state?since=${encodeURIComponent(since)}`, { signal: timeout });
    if (!data.ok) throw new Error(data.error ?? "\u540C\u6B65\u5931\u8D25");
    publish(data.state);
    return data;
  }
  async function act2(action) {
    const data = await call("/act", { method: "POST", body: action });
    if (data.state) publish(data.state);
    return data.ok ? { ok: true, state: data.state } : { ok: false, error: data.error, state: data.state };
  }
  async function leave() {
    try {
      const data = await call("/leave", { method: "POST", body: {} });
      if (data.state) publish(data.state);
    } catch {
    }
  }
  function waitFor(predicate, timeoutMs = 5e3) {
    if (latest && predicate(latest)) return Promise.resolve(latest);
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      function finish2(value) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        waiters.delete(waiter);
        resolve(value);
      }
      const waiter = (state) => {
        if (!predicate(state)) return false;
        finish2(state);
        return true;
      };
      waiters.add(waiter);
      timer = setTimeout(() => finish2(null), Math.max(0, Number(timeoutMs) || 0));
    });
  }
  async function loop() {
    while (!stopped) {
      controller = new AbortController();
      try {
        await refresh({ signal: controller.signal });
      } catch (error) {
        if (stopped) break;
        try {
          onError?.(error);
        } catch {
        }
        await delay(500, controller.signal);
      }
    }
  }
  function start() {
    if (running) return running;
    stopped = false;
    running = (async () => {
      if (!token) await join();
      await loop();
    })();
    running.catch((error) => {
      try {
        onError?.(error);
      } catch {
      }
    });
    return running;
  }
  function stop() {
    stopped = true;
    controller?.abort();
    waiters.clear();
    return running;
  }
  return {
    join,
    refresh,
    act: act2,
    leave,
    start,
    stop,
    waitFor,
    snapshot: () => latest,
    seq: () => latest?.seq ?? 0,
    seat: () => seat,
    token: () => token,
    baseUrl: base
  };
}
function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        resolve();
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    }
  });
}

// src/host.js
var name = "dsh-doudizhu";
var inject = ["webServer"];
var ROUTE = "/dsh-doudizhu";
var TOKEN_HEADER2 = "x-dsh-doudizhu-token";
var DEFAULT_PORT = 8791;
var MAX_BODY2 = 64 * 1024;
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function normaliseConfig(input) {
  const raw = input && typeof input === "object" ? input : {};
  const port = Number(raw.port);
  return {
    // 0 means "let the OS pick", which is what tests and port collisions want.
    port: Number.isInteger(port) && port >= 0 && port < 65536 ? port : DEFAULT_PORT,
    host: typeof raw.host === "string" && raw.host.trim() ? raw.host.trim() : "0.0.0.0",
    playerName: typeof raw.playerName === "string" && raw.playerName.trim() ? [...raw.playerName.trim()].slice(0, 12).join("") : "\u6211"
  };
}
function normalisePort(value, fallback) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 0 && port < 65536 ? port : fallback;
}
function sameSecret(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function sendJson(res, status, body, headers = {}) {
  if (res.writableEnded || res.destroyed) return;
  const payload = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": payload.length,
    "cache-control": "no-store",
    ...headers
  });
  res.end(payload);
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    req.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY2) {
        settled = true;
        reject(new HttpError(413, "\u8BF7\u6C42\u4F53\u8D85\u8FC7\u4E0A\u9650"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        const value = JSON.parse(text);
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          reject(new HttpError(400, "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F JSON \u5BF9\u8C61"));
          return;
        }
        resolve(value);
      } catch {
        reject(new HttpError(400, "\u8BF7\u6C42\u4F53\u4E0D\u662F\u5408\u6CD5 JSON"));
      }
    });
    req.on("error", () => reject(new HttpError(400, "\u8BFB\u53D6\u8BF7\u6C42\u4F53\u5931\u8D25")));
  });
}
function header(req, key) {
  const value = req.headers?.[key];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}
function requestOrigin(req) {
  const forwarded = header(req, "x-forwarded-proto").split(",")[0].trim().toLowerCase();
  const protocol = forwarded === "https" || forwarded === "http" ? forwarded : req.socket?.encrypted ? "https" : "http";
  const host = header(req, "host").trim();
  if (!host) return "";
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return "";
  }
}
function httpOrigin(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}
function validateOrigin(req) {
  const expected = requestOrigin(req);
  const origin = header(req, "origin").trim();
  if (origin) {
    const actual = origin === "null" ? "" : httpOrigin(origin);
    if (actual !== expected) throw new HttpError(403, "\u62D2\u7EDD\u8DE8\u6765\u6E90\u8BF7\u6C42");
  } else {
    const actual = httpOrigin(header(req, "referer").trim());
    if (actual && actual !== expected) throw new HttpError(403, "\u62D2\u7EDD\u8DE8\u6765\u6E90\u8BF7\u6C42");
  }
  if (header(req, "sec-fetch-site").trim().toLowerCase() === "cross-site") {
    throw new HttpError(403, "\u62D2\u7EDD\u8DE8\u7AD9\u8BF7\u6C42");
  }
}
function subPath(url) {
  const path = String(url ?? "/").split("?")[0];
  const rest = path.startsWith(ROUTE) ? path.slice(ROUTE.length) : "";
  return rest.replace(/^\/+|\/+$/g, "") || "state";
}
function messageOf(error) {
  return String(error && error.message || error);
}
function apply(ctx, config) {
  const settings = normaliseConfig(config);
  const localToken = Buffer.from(
    Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
  ).toString("base64url");
  let current = idle();
  function idle(lastError = null) {
    return { role: "idle", room: null, authority: null, link: null, seat: null, token: null, lastError };
  }
  function localSnapshot() {
    if (current.role === "host" && current.room) return snapshotFor(current.room, current.seat);
    if (current.role === "guest" && current.link) return current.link.snapshot();
    return null;
  }
  function localState() {
    const snapshot = localSnapshot();
    return {
      protocol: 1,
      role: current.role,
      playerName: settings.playerName,
      defaults: { port: settings.port, host: settings.host },
      authority: current.role === "host" && current.authority ? {
        code: current.authority.code,
        port: current.authority.port,
        loopbackUrl: current.authority.loopbackUrl,
        lanUrls: [...current.authority.lanUrls],
        lanCandidates: (current.authority.lanCandidates || []).map((entry) => ({ ...entry }))
      } : null,
      guest: current.role === "guest" && current.link ? { baseUrl: current.link.baseUrl, seat: current.link.seat(), connected: true } : null,
      lastError: current.lastError,
      snapshot
    };
  }
  async function shutdown() {
    const previous = current;
    current = idle(previous.lastError);
    if (previous.link) {
      previous.link.stop();
      try {
        await previous.link.leave();
      } catch {
      }
    }
    if (previous.authority) {
      try {
        await previous.authority.close();
      } catch {
      }
    }
    return previous;
  }
  async function becomeHost(input = {}) {
    const port = normalisePort(input.port, settings.port);
    const playerName = typeof input.name === "string" && input.name.trim() ? input.name.trim() : settings.playerName;
    if (port && current.role === "host" && current.authority?.port === port) await shutdown();
    const room = createRoom({ name: "\u6597\u5730\u4E3B\u623F\u95F4" });
    if (isBotLevel(input.botLevel)) room.botLevel = String(input.botLevel);
    let authority;
    try {
      authority = await createAuthorityServer(room, { host: settings.host, port });
    } catch (error) {
      current.lastError = `\u5F00\u623F\u5931\u8D25\uFF1A${messageOf(error)}`;
      return { ok: false, error: current.lastError };
    }
    const joined = joinSeat(room, { name: playerName });
    if (!joined.ok) {
      await authority.close();
      current.lastError = `\u5165\u5EA7\u5931\u8D25\uFF1A${joined.error}`;
      return { ok: false, error: current.lastError };
    }
    await shutdown();
    current = { role: "host", room, authority, link: null, seat: joined.seat, token: joined.token, lastError: null };
    return { ok: true };
  }
  async function becomeGuest(input = {}) {
    const host = String(input.host ?? "").trim();
    const port = String(input.port ?? "").trim();
    const code = String(input.code ?? "").trim().toUpperCase();
    const playerName = typeof input.name === "string" && input.name.trim() ? input.name.trim() : settings.playerName;
    const baseUrl = String(input.url ?? "").trim() || String(input.baseUrl ?? "").trim() || (host ? `http://${host}${port ? `:${port}` : ""}` : "");
    if (!baseUrl) return { ok: false, error: "\u8BF7\u586B\u5199\u623F\u4E3B\u5730\u5740\uFF08\u4F8B\u5982 192.168.1.50:8791\uFF09" };
    if (!code) return { ok: false, error: "\u8BF7\u586B\u5199\u623F\u95F4\u7801" };
    const sameRoom = current.role === "guest" && current.link?.baseUrl === baseUrl;
    const link = createFollowerLink({
      baseUrl,
      code,
      name: playerName,
      token: sameRoom ? current.token : void 0,
      pollTimeoutMs: 2e4
    });
    try {
      await link.join();
    } catch (error) {
      current.lastError = `\u5165\u5EA7\u5931\u8D25\uFF1A${messageOf(error)}`;
      return { ok: false, error: current.lastError };
    }
    await shutdown();
    current = { role: "guest", room: null, authority: null, link, seat: link.seat(), token: link.token(), lastError: null };
    link.start();
    return { ok: true };
  }
  async function probe(input = {}) {
    const host = String(input.host ?? "").trim();
    const port = String(input.port ?? "").trim();
    const baseUrl = String(input.url ?? "").trim() || String(input.baseUrl ?? "").trim() || (host ? `http://${host}${port ? `:${port}` : ""}` : "");
    if (!baseUrl) return { ok: false, error: "\u8BF7\u586B\u5199\u623F\u4E3B\u5730\u5740" };
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/hello`);
      const data = await response.json();
      return { ok: true, hello: data };
    } catch (error) {
      return { ok: false, error: `\u8FDE\u4E0D\u4E0A ${baseUrl}\uFF1A${messageOf(error)}` };
    }
  }
  async function localAction(action) {
    if (current.role === "host" && current.room) {
      const result = act(current.room, current.token, action);
      const snapshot = snapshotFor(current.room, current.seat);
      if (!result.ok) return { ok: false, error: result.error, snapshot };
      return { ok: true, snapshot: snapshotFor(current.room, result.seat) };
    }
    if (current.role === "guest" && current.link) {
      const result = await current.link.act(action);
      return { ok: result.ok, error: result.error ?? null, snapshot: localSnapshot() };
    }
    return { ok: false, error: "\u8FD8\u6CA1\u8FDB\u684C\uFF1A\u5148\u5F00\u623F\u6216\u52A0\u5165\u623F\u95F4" };
  }
  async function route(req, res) {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const action = subPath(req.url);
      if (method === "GET") {
        if (action !== "state") throw new HttpError(404, `\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3\uFF1AGET ${action}`);
        sendJson(res, 200, { ok: true, ...localState() }, { [TOKEN_HEADER2]: localToken });
        return;
      }
      if (method !== "POST") throw new HttpError(405, `\u4E0D\u652F\u6301\u7684\u65B9\u6CD5\uFF1A${method}`);
      validateOrigin(req);
      if (!sameSecret(header(req, TOKEN_HEADER2), localToken)) throw new HttpError(403, "\u672C\u5730\u4EE4\u724C\u6821\u9A8C\u5931\u8D25");
      const body = await readJson(req);
      if (action === "host") {
        const result = await becomeHost(body);
        sendJson(res, result.ok ? 200 : 409, { ...localState(), ok: result.ok, error: result.error ?? null });
        return;
      }
      if (action === "join") {
        const result = await becomeGuest(body);
        sendJson(res, result.ok ? 200 : 409, { ...localState(), ok: result.ok, error: result.error ?? null });
        return;
      }
      if (action === "probe") {
        sendJson(res, 200, await probe(body));
        return;
      }
      if (action === "act") {
        const action_ = body.action && typeof body.action === "object" ? body.action : body;
        sendJson(res, 200, { ...await localAction(action_), role: current.role });
        return;
      }
      if (action === "leave") {
        await shutdown();
        sendJson(res, 200, { ok: true, ...localState() });
        return;
      }
      throw new HttpError(404, `\u6CA1\u6709\u8FD9\u4E2A\u63A5\u53E3\uFF1APOST ${action}`);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const headers = status === 413 ? { connection: "close" } : {};
      sendJson(res, status, { ok: false, error: messageOf(error) }, headers);
    }
  }
  ctx.effect(function() {
    return ctx.webServer.register({ kind: "prefix", path: ROUTE, handler: route });
  });
  ctx.effect(function() {
    return function() {
      void shutdown();
    };
  });
  return { localState, becomeHost, becomeGuest, localAction, shutdown, settings };
}
export {
  DEFAULT_PORT,
  ROUTE,
  TOKEN_HEADER2 as TOKEN_HEADER,
  apply,
  inject,
  name,
  normaliseConfig
};
