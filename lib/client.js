/* dsh-doudizhu client bundle — generated from src/client.cjs */
window.__ModuleLoader__.load({
  id: "dsh-doudizhu",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client-css.cjs
var require_client_css = __commonJS({
  "src/client-css.cjs"(exports2, module2) {
    module2.exports = `
.ddz-pill{position:fixed;z-index:60;display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;
  background:var(--dsw-alias-bg-overlay,#1c1c22);color:var(--dsw-alias-label-primary,#eee);cursor:pointer;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));box-shadow:0 6px 18px rgba(0,0,0,.35);
  font-size:12px;pointer-events:auto;user-select:none;font-family:inherit}
.ddz-pill:hover{border-color:var(--dsw-alias-brand-primary,#4a7dff)}
.ddz-pill .ddz-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary,#888)}
.ddz-pill.turn .ddz-dot{background:var(--dsw-alias-state-success-primary,#3ecf72)}

.ddz-mini{position:fixed;z-index:60;display:flex;flex-direction:column;width:344px;max-height:78vh;
  background:var(--dsw-alias-bg-overlay,#1c1c22);color:var(--dsw-alias-label-primary,#eee);
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:14px;
  box-shadow:0 16px 40px rgba(0,0,0,.45);pointer-events:auto;overflow:hidden;
  font-family:inherit;font-size:13px;line-height:1.5}
.ddz-mini-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.ddz-mini-bar.dragging{cursor:grabbing}
.ddz-mini-title{font-weight:600}
.ddz-mini-meta{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-ico-btn{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:6px;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));background:transparent;color:inherit;
  cursor:pointer;font-size:13px;line-height:1;padding:0}
.ddz-ico-btn:hover{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08))}
.ddz-mini-body{padding:10px;overflow:auto;display:flex;flex-direction:column;gap:9px;flex:1}
.ddz-mini-foot{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}

.ddz-view{display:flex;flex-direction:column;gap:14px;padding:20px;height:100%;box-sizing:border-box;
  color:var(--dsw-alias-label-primary,#eee);overflow:auto;font-family:inherit;font-size:14px}
.ddz-view-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ddz-view h2{margin:0;font-size:17px}

.ddz-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ddz-col{display:flex;flex-direction:column;gap:8px}
.ddz-grow{flex:1;min-width:0}
.ddz-note{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-err{font-size:12px;color:var(--dsw-alias-state-error-primary,#ff6b6b);white-space:pre-wrap;word-break:break-word}
.ddz-ok{font-size:12px;color:var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary,#9aa)}

.ddz-input,.ddz-select{padding:5px 8px;border-radius:7px;font:inherit;font-size:13px;min-width:0;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));color:inherit;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.16))}
.ddz-input:focus,.ddz-select:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4a7dff)}
.ddz-btn{padding:5px 12px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08));color:inherit;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.16))}
.ddz-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#4a7dff)}
.ddz-btn:disabled{opacity:.42;cursor:not-allowed}
.ddz-btn.primary{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;
  color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base,#111))}
.ddz-btn.ghost{background:transparent}
.ddz-btn.sm{padding:3px 9px;font-size:12px}

.ddz-badge{font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.22));
  color:var(--dsw-alias-label-secondary,#9aa);white-space:nowrap}
.ddz-badge.landlord{color:var(--dsw-alias-state-warn-primary,#ffcf5c);border-color:currentColor}
.ddz-badge.farmer{color:var(--dsw-alias-state-success-primary,#8fd6a0);border-color:currentColor}
.ddz-badge.turn{color:var(--dsw-alias-state-success-primary,#3ecf72);border-color:currentColor}
.ddz-badge.gone{color:var(--dsw-alias-state-error-primary,#ff6b6b);border-color:currentColor}

.ddz-seat{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:9px;font-size:12px;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05));border:1px solid transparent}
.ddz-seat.active{border-color:var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-seat.me{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.09))}
.ddz-seat-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddz-seat-count{margin-left:auto;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums}
.ddz-seats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ddz-seats .ddz-seat.wide{grid-column:1 / -1}

.ddz-table{border-radius:11px;padding:8px;min-height:76px;display:flex;flex-direction:column;gap:6px;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04));border:1px dashed var(--dsw-alias-border-l2,rgba(255,255,255,.18))}
.ddz-play{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}
.ddz-play-who{color:var(--dsw-alias-label-secondary,#9aa);min-width:52px}
.ddz-empty{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa)}

.ddz-hand{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;min-height:52px}
.ddz-card{width:34px;height:48px;border-radius:6px;display:flex;flex-direction:column;align-items:center;
  justify-content:center;cursor:pointer;user-select:none;padding:0;font:inherit;
  background:var(--dsw-alias-bg-layer-2,#26262e);color:var(--dsw-alias-label-primary,#eee);
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.22));transition:transform .06s ease}
.ddz-card:hover{transform:translateY(-3px)}
.ddz-card .ddz-rank{font-size:14px;font-weight:700;line-height:1}
.ddz-card .ddz-suit{font-size:12px;line-height:1}
.ddz-card.red{color:var(--dsw-alias-state-error-primary,#ff6b6b)}
.ddz-card.joker .ddz-rank{font-size:11px}
.ddz-card.joker.big{color:var(--dsw-alias-state-warn-primary,#ffcf5c)}
.ddz-card.sel{transform:translateY(-9px);border-color:var(--dsw-alias-brand-primary,#4a7dff);
  box-shadow:0 0 0 1px var(--dsw-alias-brand-primary,#4a7dff)}
.ddz-card.mini{width:26px;height:36px}
.ddz-card.mini .ddz-rank{font-size:11px}
.ddz-card.mini .ddz-suit{font-size:9px}

.ddz-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.14em;font-weight:700}
.ddz-urls{display:flex;flex-direction:column;gap:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.ddz-urls code{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));padding:2px 6px;border-radius:5px;
  cursor:pointer;word-break:break-all}
.ddz-share{font-size:12px;padding:7px 9px;border-radius:8px;word-break:break-all;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12))}
.ddz-tabs{display:flex;gap:4px}
.ddz-tabs button{flex:1;padding:4px 0;font:inherit;font-size:12px;cursor:pointer;border-radius:7px;
  background:transparent;color:var(--dsw-alias-label-secondary,#9aa);border:1px solid transparent}
.ddz-tabs button.on{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08));color:inherit;
  border-color:var(--dsw-alias-border-l1,rgba(255,255,255,.14))}
.ddz-log{display:flex;flex-direction:column;gap:4px;font-size:12px}
.ddz-log-item{display:flex;gap:6px;align-items:baseline}
.ddz-log-item .ddz-at{color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums}
.ddz-divider{height:1px;background:var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.ddz-chips{display:flex;gap:4px}
.ddz-chips button{flex:1;padding:4px 0;font:inherit;font-size:12px;cursor:pointer;border-radius:7px;
  background:transparent;color:var(--dsw-alias-label-secondary,#9aa);
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14))}
.ddz-chips button.on{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;
  color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base,#111))}
.ddz-chips button:disabled{opacity:.45;cursor:not-allowed}
.ddz-badge.bot{color:#9ecbff;border-color:currentColor}
`;
  }
});

// src/rules.js
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
var RANKS, SUITS, SUIT_SYMBOLS, RANK_VALUES, JOKER_VALUES, SMALL_JOKER, BIG_JOKER, MAX_SEQUENCE_VALUE, MIN_STRAIGHT, MIN_PAIR_STRAIGHT, MIN_PLANE, MOVE_LABELS, BID_LABELS;
var init_rules = __esm({
  "src/rules.js"() {
    RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
    SUITS = ["S", "H", "D", "C"];
    SUIT_SYMBOLS = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
    RANK_VALUES = Object.fromEntries(RANKS.map((rank, index) => [rank, index + 3]));
    JOKER_VALUES = { LJ: 16, BJ: 17 };
    SMALL_JOKER = "LJ";
    BIG_JOKER = "BJ";
    MAX_SEQUENCE_VALUE = 14;
    MIN_STRAIGHT = 5;
    MIN_PAIR_STRAIGHT = 3;
    MIN_PLANE = 2;
    MOVE_LABELS = {
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
    BID_LABELS = { 0: "\u4E0D\u53EB", 1: "1 \u5206", 2: "2 \u5206", 3: "3 \u5206" };
  }
});

// src/ui-logic.js
var ui_logic_exports = {};
__export(ui_logic_exports, {
  BOT_BLURBS: () => BOT_BLURBS,
  BOT_LABELS: () => BOT_LABELS,
  BOT_LEVELS: () => BOT_LEVELS,
  DEFAULT_BOT_LEVEL: () => DEFAULT_BOT_LEVEL,
  EDGE: () => EDGE,
  MINI_H: () => MINI_H,
  MINI_W: () => MINI_W,
  PREFS_KEY: () => PREFS_KEY,
  ROUTE_BODIES: () => ROUTE_BODIES,
  activeSeat: () => activeSeat,
  bidOptions: () => bidOptions,
  botCapacity: () => botCapacity,
  botSeatLabel: () => botSeatLabel,
  canSubmitPlay: () => canSubmitPlay,
  cardText: () => cardText,
  cardTone: () => cardTone,
  clampPosition: () => clampPosition,
  controlsFor: () => controlsFor,
  handForDisplay: () => handForDisplay,
  hiddenLanCandidates: () => hiddenLanCandidates,
  isBotLevel: () => isBotLevel,
  lanChips: () => lanChips,
  logEntries: () => logEntries,
  normaliseAddress: () => normaliseAddress,
  phaseLabel: () => phaseLabel,
  playEntries: () => playEntries,
  playError: () => playError,
  prefsFrom: () => prefsFrom,
  relativeSeat: () => relativeSeat,
  roleLabel: () => roleLabel,
  seatName: () => seatName,
  selectionSummary: () => selectionSummary,
  shareText: () => shareText,
  statusLine: () => statusLine,
  suitSymbol: () => suitSymbol,
  toggleSelection: () => toggleSelection
});
function cardText(id) {
  return cardFromId(id)?.label ?? String(id ?? "");
}
function cardTone(id) {
  const card = cardFromId(id);
  if (!card) return "plain";
  if (card.joker) return "joker";
  return card.suit === "H" || card.suit === "D" ? "red" : "black";
}
function handForDisplay(ids = []) {
  return [...ids].sort((left, right) => {
    const a = cardFromId(left);
    const b = cardFromId(right);
    if (!a || !b) return 0;
    return b.value - a.value || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
  });
}
function toggleSelection(selection2 = [], id) {
  return selection2.includes(id) ? selection2.filter((card) => card !== id) : [...selection2, id];
}
function playError(snapshot, selection2 = []) {
  if (!snapshot) return "\u8FD8\u6CA1\u8FDB\u684C";
  if (snapshot.phase !== "playing") return "\u73B0\u5728\u4E0D\u662F\u51FA\u724C\u9636\u6BB5";
  if (!snapshot.canAct) return "\u8FD8\u6CA1\u8F6E\u5230\u4F60";
  if (!selection2.length) return "\u5148\u9009\u724C";
  const hand = new Set(snapshot.you?.hand ?? []);
  if (selection2.some((id) => !hand.has(id))) return "\u9009\u4E86\u4E0D\u5728\u624B\u91CC\u7684\u724C";
  if (new Set(selection2).size !== selection2.length) return "\u540C\u4E00\u5F20\u724C\u9009\u4E86\u4E24\u6B21";
  const move2 = classifyMove(selection2);
  if (!move2) return "\u8FD9\u4E0D\u662F\u5408\u6CD5\u724C\u578B";
  const last = snapshot.lastPlay;
  if (last && last.move && !canBeat(move2, last.move)) return `\u538B\u4E0D\u8FC7\u4E0A\u5BB6\u7684${last.move.label}`;
  return "";
}
function canSubmitPlay(snapshot, selection2 = []) {
  return playError(snapshot, selection2) === "";
}
function selectionSummary(selection2 = []) {
  if (!selection2.length) return "";
  const move2 = classifyMove(selection2);
  return move2 ? `${move2.label} \xB7 ${selection2.length} \u5F20` : `\u5DF2\u9009 ${selection2.length} \u5F20 \xB7 \u4E0D\u6210\u724C\u578B`;
}
function phaseLabel(phase) {
  return PHASE_TEXT[phase] ?? "\u2014";
}
function roleLabel(role) {
  if (role === "landlord") return "\u5730\u4E3B";
  if (role === "farmer") return "\u519C\u6C11";
  return "";
}
function seatName(snapshot, seat) {
  return snapshot?.seats?.[seat]?.name ?? `\u5EA7\u4F4D${Number(seat) + 1}`;
}
function relativeSeat(seat, youSeat, seats = 3) {
  const delta = ((seat - youSeat) % seats + seats) % seats;
  if (delta === 0) return "you";
  return delta === 1 ? "right" : "left";
}
function activeSeat(snapshot) {
  if (!snapshot) return null;
  if (snapshot.phase === "bidding") return snapshot.bidTurnSeat ?? null;
  if (snapshot.phase === "playing") return snapshot.toAct ?? null;
  return null;
}
function bidOptions(snapshot) {
  const highest = (snapshot?.bids ?? []).reduce((max, bid) => Math.max(max, Number(bid.score) || 0), 0);
  const myTurn = Boolean(snapshot?.canBid);
  return [0, 1, 2, 3].map((score) => ({
    score,
    label: BID_LABELS[String(score)],
    enabled: myTurn && (score === 0 || score > highest)
  }));
}
function controlsFor(snapshot) {
  const controls = {
    phase: snapshot?.phase ?? null,
    showBid: false,
    showPlay: false,
    showPass: false,
    showNext: false,
    showStart: false,
    bidOptions: [],
    playEnabled: false,
    passEnabled: false,
    note: ""
  };
  if (!snapshot || !snapshot.you) return controls;
  if (snapshot.phase === "lobby") {
    controls.showStart = (snapshot.seatsTaken ?? 0) >= 3;
    controls.note = `\u5DF2\u5165\u5EA7 ${snapshot.seatsTaken ?? 0}/3\uFF0C\u4E09\u4EBA\u5230\u9F50\u81EA\u52A8\u5F00\u5C40`;
    return controls;
  }
  if (snapshot.phase === "bidding") {
    controls.showBid = true;
    controls.bidOptions = bidOptions(snapshot);
    controls.note = snapshot.canBid ? "\u8F6E\u5230\u4F60\u53EB\u5206" : `\u7B49 ${seatName(snapshot, snapshot.bidTurnSeat)} \u53EB\u5206`;
    return controls;
  }
  if (snapshot.phase === "playing") {
    controls.showPlay = true;
    controls.showPass = true;
    controls.playEnabled = Boolean(snapshot.canAct);
    controls.passEnabled = Boolean(snapshot.canPass);
    const last = snapshot.lastPlay;
    if (!snapshot.canAct) controls.note = `\u7B49 ${seatName(snapshot, snapshot.toAct)} \u51FA\u724C`;
    else if (snapshot.canPass) controls.note = last ? `\u8F6E\u5230\u4F60\uFF1A\u538B\u8FC7${last.move?.label ?? "\u4E0A\u5BB6"}\uFF0C\u6216\u4E0D\u51FA` : "\u8F6E\u5230\u4F60\u51FA\u724C";
    else controls.note = "\u8F6E\u5230\u4F60\uFF1A\u5148\u624B\u5FC5\u987B\u51FA\u724C";
    return controls;
  }
  if (snapshot.phase === "finished") {
    controls.showNext = true;
    const won = snapshot.winnerSide === "landlord" ? "\u5730\u4E3B\u8D62\u4E86" : "\u519C\u6C11\u8D62\u4E86";
    controls.note = `${won} \xB7 \u5730\u4E3B ${snapshot.landlordSeat === null ? "\u2014" : seatName(snapshot, snapshot.landlordSeat)}`;
    return controls;
  }
  return controls;
}
function statusLine(snapshot, controls) {
  const hint = snapshot?.hint;
  if (typeof hint === "string" && hint) return hint;
  return controls?.note ?? "";
}
function logEntries(snapshot) {
  const entries = Array.isArray(snapshot?.log) ? snapshot.log : [];
  return entries.map((entry, index) => ({ key: String(entry?.seq ?? index), text: String(entry?.note ?? "") })).filter((entry) => entry.text);
}
function playEntries(snapshot) {
  const plays = Array.isArray(snapshot?.plays) ? snapshot.plays : [];
  const seats = Array.isArray(snapshot?.seats) ? snapshot.seats : [];
  return plays.map((play, index) => {
    const who = seats[play?.seat]?.name ?? `\u5EA7\u4F4D${Number(play?.seat) + 1}`;
    const cards = Array.isArray(play?.cards) ? play.cards.map(cardText).join(" ") : "";
    const shape = play?.move?.label ?? "";
    return { key: `p${index}`, who, cards, shape, text: cards ? `${who} ${shape} ${cards}`.trim() : `${who} \u4E0D\u51FA` };
  });
}
function shareText(authority) {
  if (!authority || !authority.code) return "";
  const urls = Array.isArray(authority.lanUrls) ? authority.lanUrls : [];
  const where = (urls.length ? urls : [authority.loopbackUrl ?? ""]).map((url) => String(url).replace(/^https?:\/\//, "")).filter(Boolean);
  if (!where.length) return `\u623F\u95F4\u7801 ${authority.code}`;
  return `\u623F\u95F4\u7801 ${authority.code} \xB7 \u5730\u5740 ${where.join(" \u6216 ")}`;
}
function isBotLevel(value) {
  return BOT_LEVELS.includes(String(value ?? ""));
}
function botSeatLabel(level) {
  return isBotLevel(level) ? `\u7535\u8111\xB7${BOT_LABELS[level]}` : "\u7535\u8111";
}
function botCapacity(snapshot) {
  const seats = Array.isArray(snapshot?.seats) ? snapshot.seats : [];
  if (!seats.length) return 0;
  const humans = seats.filter((entry) => entry && entry.occupied && !entry.bot).length;
  return Math.max(0, seats.length - humans);
}
function lanChips(authority) {
  const candidates = Array.isArray(authority?.lanCandidates) ? authority.lanCandidates : [];
  const real = candidates.filter((entry) => entry && entry.url && !entry.virtual);
  if (real.length) return real.map((entry) => ({ key: entry.url, url: entry.url, iface: entry.iface || "" }));
  const urls = Array.isArray(authority?.lanUrls) ? authority.lanUrls : [];
  return urls.map((url) => ({ key: url, url, iface: "" }));
}
function hiddenLanCandidates(authority) {
  const candidates = Array.isArray(authority?.lanCandidates) ? authority.lanCandidates : [];
  return candidates.filter((entry) => entry && entry.url && entry.virtual);
}
function normaliseAddress(text) {
  const value = String(text ?? "").trim().replace(/\/+$/, "");
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}
function prefsFrom(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const x = typeof value.x === "number" && Number.isFinite(value.x) ? Math.round(value.x) : null;
  const y = typeof value.y === "number" && Number.isFinite(value.y) ? Math.round(value.y) : null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  return {
    x,
    y,
    collapsed: value.collapsed === true,
    // Only the table pane is shipped so far; anything else falls back to it.
    pane: value.pane === "log" ? "log" : "table",
    name: [...name].slice(0, 12).join(""),
    botLevel: isBotLevel(value.botLevel) ? String(value.botLevel) : DEFAULT_BOT_LEVEL
  };
}
function clampPosition(x, y, viewport2 = {}, size = {}) {
  const width = Number(viewport2.width) || 0;
  const height = Number(viewport2.height) || 0;
  const boxW = Number(size.width) || MINI_W;
  const boxH = Number(size.height) || MINI_H;
  const maxX = Math.max(EDGE, width - boxW - EDGE);
  const maxY = Math.max(EDGE, height - boxH - EDGE);
  const rawX = Number.isFinite(x) ? x : maxX;
  const rawY = Number.isFinite(y) ? y : maxY;
  return {
    x: Math.min(Math.max(EDGE, Math.round(rawX)), maxX),
    y: Math.min(Math.max(EDGE, Math.round(rawY)), maxY)
  };
}
function suitSymbol(id) {
  const card = cardFromId(id);
  if (!card || card.joker) return "";
  return SUIT_SYMBOLS[card.suit] ?? "";
}
var PREFS_KEY, MINI_W, MINI_H, EDGE, SUIT_ORDER, PHASE_TEXT, ROUTE_BODIES, BOT_LEVELS, BOT_LABELS, DEFAULT_BOT_LEVEL, BOT_BLURBS;
var init_ui_logic = __esm({
  "src/ui-logic.js"() {
    init_rules();
    PREFS_KEY = "dsh-doudizhu.prefs";
    MINI_W = 344;
    MINI_H = 468;
    EDGE = 8;
    SUIT_ORDER = ["S", "H", "D", "C"];
    PHASE_TEXT = {
      lobby: "\u7B49\u4EBA",
      bidding: "\u53EB\u5206",
      playing: "\u51FA\u724C",
      finished: "\u672C\u5C40\u7ED3\u675F",
      redeal: "\u6D41\u5C40\u91CD\u53D1"
    };
    ROUTE_BODIES = {
      host: ["port", "name", "botLevel"],
      join: ["url", "code", "name"],
      probe: ["url"],
      act: ["action"],
      leave: []
    };
    BOT_LEVELS = ["easy", "medium", "hard", "hell"];
    BOT_LABELS = { easy: "\u7B80\u5355", medium: "\u4E2D\u7B49", hard: "\u56F0\u96BE", hell: "\u5730\u72F1" };
    DEFAULT_BOT_LEVEL = "medium";
    BOT_BLURBS = {
      easy: "\u968F\u4FBF\u6253\uFF1A\u7ECF\u5E38\u4E71\u51FA\u4E00\u624B\uFF0C\u4E5F\u770B\u4E0D\u51FA\u81EA\u5DF1\u80FD\u4E00\u628A\u8D70\u5B8C\u3002\uFF08\u5B9E\u6D4B\u4E09\u6863\u91CC\u6700\u5F31\uFF09",
      medium: "\u4F1A\u538B\u6700\u5C0F\u7684\u724C\u3001\u7559\u70B8\u5F39\u3001\u80FD\u8D70\u5B8C\u5C31\u8D70\u5B8C\uFF0C\u519C\u6C11\u4E0D\u538B\u5FEB\u8D70\u5B8C\u7684\u961F\u53CB\uFF1B\u4F46\u4E0D\u7B97\u724C\u4E5F\u4E0D\u89C4\u5212\uFF0C\u5148\u624B\u53EA\u51FA\u6700\u5C0F\u7684\u4E00\u5F20\u3002",
      hard: '\u5148\u624B\u6309"\u8FD8\u5269\u51E0\u624B"\u9009\u724C\uFF0C\u53EB\u5206\u66F4\u51F6\uFF0C\u5176\u4F59\u540C\u4E2D\u7B49\u3002',
      hell: '\u4F1A\u8BB0\u8D26\uFF1A\u8C01\u5FEB\u8D70\u5B8C\u65F6\u5148\u7B97"\u6211\u8FD9\u4E00\u624B\u538B\u4E0D\u538B\u5F97\u4F4F"\uFF0C\u538B\u4E0D\u4F4F\u5C31\u4E0A\u70B8\u5F39\uFF0C\u8FD8\u80FD\u7B97\u51FA\u4E00\u8DEF\u538B\u7740\u8D70\u5B8C\u7684\u5FC5\u6740\u8DEF\u7EBF\u3002'
    };
  }
});

// src/client.cjs
var React = require("react");
var h = React.createElement;
var CSS = require_client_css();
var UI = (init_ui_logic(), __toCommonJS(ui_logic_exports));
var API = "/dsh-doudizhu";
var TOKEN_HEADER = "x-dsh-doudizhu-token";
var POLL_MS = 900;
var POLL_MS_QUIET = 2600;
var PILL_W = 148;
var localToken = "";
var store = { data: null, error: "", actionError: "", busy: false, at: 0 };
var selection = [];
var lastPhase;
var period = POLL_MS;
var timer = null;
var inflight = false;
var listeners = /* @__PURE__ */ new Set();
function emit() {
  const view = store;
  for (const fn of Array.from(listeners)) fn(view);
}
function messageOf(error) {
  return String(error && error.message || error || "\u672A\u77E5\u9519\u8BEF");
}
function headers(extra) {
  return Object.assign({}, extra || {}, localToken ? { [TOKEN_HEADER]: localToken } : {});
}
function pruneSelection(data) {
  const snapshot = data && data.snapshot;
  const phase = snapshot ? snapshot.phase : null;
  if (phase !== lastPhase) {
    selection = [];
    lastPhase = phase;
  }
  if (!snapshot || !snapshot.you || !Array.isArray(snapshot.you.hand)) {
    selection = [];
    return;
  }
  const hand = new Set(snapshot.you.hand);
  selection = selection.filter(function(id) {
    return hand.has(id);
  });
}
function load() {
  if (inflight) return Promise.resolve(null);
  inflight = true;
  return fetch(API + "/state", { headers: headers() }).then(function(res) {
    const token = res.headers.get(TOKEN_HEADER);
    if (token) localToken = token;
    return res.json();
  }).then(function(data) {
    store = Object.assign({}, store, { data, error: "", at: Date.now() });
    pruneSelection(data);
    emit();
    return data;
  }).catch(function(error) {
    store = Object.assign({}, store, { error: messageOf(error), at: Date.now() });
    emit();
    return null;
  }).then(function(value) {
    inflight = false;
    return value;
  });
}
function tick() {
  load();
}
function subscribe(fn) {
  listeners.add(fn);
  if (timer === null) {
    load();
    timer = setInterval(tick, period);
  }
  fn(store);
  return function() {
    listeners.delete(fn);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
function setPeriod(ms) {
  if (ms === period) return;
  period = ms;
  if (timer !== null) {
    clearInterval(timer);
    timer = setInterval(tick, period);
  }
}
function useStore() {
  const [view, setView] = React.useState(store);
  React.useEffect(function() {
    return subscribe(setView);
  }, []);
  return view;
}
function post(path, body) {
  if (store.busy) return Promise.resolve(null);
  store = Object.assign({}, store, { busy: true, actionError: "" });
  emit();
  return fetch(API + "/" + path, {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify(body || {})
  }).then(function(res) {
    return res.json();
  }).then(function(result) {
    const ok = Boolean(result) && result.ok !== false;
    store = Object.assign({}, store, {
      busy: false,
      actionError: ok ? "" : String(result && result.error || "\u8BF7\u6C42\u88AB\u62D2\u7EDD")
    });
    emit();
    return load();
  }).catch(function(error) {
    store = Object.assign({}, store, { busy: false, actionError: messageOf(error) });
    emit();
    return null;
  });
}
function act(action) {
  if (store.busy) return Promise.resolve(null);
  store = Object.assign({}, store, { busy: true, actionError: "" });
  emit();
  return fetch(API + "/act", {
    method: "POST",
    headers: headers({ "content-type": "application/json" }),
    body: JSON.stringify({ action })
  }).then(function(res) {
    return res.json();
  }).then(function(result) {
    const ok = Boolean(result) && result.ok !== false;
    store = Object.assign({}, store, {
      busy: false,
      actionError: ok ? "" : String(result && result.error || "\u8FD9\u4E00\u624B\u6CA1\u88AB\u63A5\u53D7")
    });
    if (ok) selection = [];
    emit();
    return load();
  }).catch(function(error) {
    store = Object.assign({}, store, { busy: false, actionError: messageOf(error) });
    emit();
    return null;
  });
}
function readPrefs() {
  try {
    return UI.prefsFrom(JSON.parse(window.localStorage.getItem(UI.PREFS_KEY) || "null"));
  } catch (error) {
    return UI.prefsFrom(null);
  }
}
function usePrefs() {
  const [prefs, setPrefsState] = React.useState(readPrefs);
  const setPrefs = React.useCallback(function(patch) {
    setPrefsState(function(previous) {
      const next = typeof patch === "function" ? patch(previous) : Object.assign({}, previous, patch);
      try {
        window.localStorage.setItem(UI.PREFS_KEY, JSON.stringify(next));
      } catch (error) {
      }
      return next;
    });
  }, []);
  return [prefs, setPrefs];
}
function viewport() {
  return { width: window.innerWidth || 1200, height: window.innerHeight || 800 };
}
function copy(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
  } catch (error) {
  }
}
function Card(props) {
  const id = props.id;
  const tone = UI.cardTone(id);
  const text = UI.cardText(id);
  const joker = tone === "joker";
  const className = "ddz-card " + tone + (props.selected ? " sel" : "") + (props.mini ? " mini" : "") + (id === "BJ" ? " big" : "");
  const children = [
    h("span", { key: "r", className: "ddz-rank" }, joker ? text : text.replace(/^[^\dAKQJ10]+/, "") || text),
    joker ? null : h("span", { key: "s", className: "ddz-suit" }, UI.suitSymbol(id))
  ];
  if (!props.onToggle) {
    return h("div", { className, title: text }, children);
  }
  return h("button", {
    type: "button",
    className,
    title: text,
    "aria-pressed": props.selected ? "true" : "false",
    onClick: function() {
      props.onToggle(id);
    }
  }, children);
}
function Hand(props) {
  const ids = UI.handForDisplay(props.ids || []);
  if (!ids.length) return h("div", { className: "ddz-empty" }, props.empty || "\u6CA1\u6709\u624B\u724C");
  return h("div", { className: "ddz-hand" }, ids.map(function(id) {
    return h(Card, {
      key: id,
      id,
      mini: props.mini,
      selected: (props.selection || []).indexOf(id) >= 0,
      onToggle: props.onToggle
    });
  }));
}
function SeatRow(props) {
  const info = (props.snapshot.seats || [])[props.seat];
  if (!info) return null;
  const role = UI.roleLabel(info.role);
  const active = UI.activeSeat(props.snapshot) === props.seat;
  const className = "ddz-seat" + (active ? " active" : "") + (props.seat === props.youSeat ? " me" : "") + (props.wide ? " wide" : "");
  const marks = [];
  if (role) marks.push(h("span", { key: "role", className: "ddz-badge " + info.role }, role));
  if (info.bot) marks.push(h("span", { key: "bot", className: "ddz-badge bot", title: UI.BOT_BLURBS[info.bot] || "" }, "\u7535\u8111"));
  if (active) marks.push(h("span", { key: "turn", className: "ddz-badge turn" }, "\u884C\u52A8\u4E2D"));
  if (info.occupied && !info.connected) marks.push(h("span", { key: "gone", className: "ddz-badge gone" }, "\u6389\u7EBF"));
  if (!info.occupied) marks.push(h("span", { key: "empty", className: "ddz-badge" }, "\u7A7A\u4F4D"));
  return h(
    "div",
    { className },
    h("span", { className: "ddz-seat-name" }, (props.seat === props.youSeat ? "\u4F60 \xB7 " : "") + info.name),
    marks,
    h(
      "span",
      { className: "ddz-seat-count" },
      info.hand ? info.hand.length + " \u5F20" : info.count + " \u5F20"
    )
  );
}
function Felt(props) {
  const s = props.snapshot;
  const last = s.lastPlay;
  const parts = [
    h(
      "div",
      { key: "last", className: "ddz-play" },
      last ? [
        h("span", { key: "who", className: "ddz-play-who" }, (s.seats || [])[last.seat]?.name ?? ""),
        last.move ? h("span", { key: "shape", className: "ddz-badge" }, last.move.label) : null,
        (last.cards || []).map(function(id) {
          return h(Card, { key: id, id, mini: true });
        })
      ] : h("span", { className: "ddz-empty" }, s.phase === "finished" ? "\u672C\u5C40\u7ED3\u675F" : "\u53F0\u9762\u7A7A\u7740")
    )
  ];
  if (s.bottomRevealed && Array.isArray(s.bottom) && s.bottom.length) {
    parts.push(h(
      "div",
      { key: "bottom", className: "ddz-play" },
      h("span", { className: "ddz-play-who" }, "\u5E95\u724C"),
      s.bottom.map(function(id) {
        return h(Card, { key: id, id, mini: true });
      })
    ));
  }
  if (s.passes) parts.push(h("span", { key: "passes", className: "ddz-note" }, "\u8FDE\u7EED " + s.passes + " \u5BB6\u4E0D\u51FA"));
  return h("div", { className: "ddz-table" }, parts);
}
function ActionRow(props) {
  const s = props.snapshot;
  const c = props.controls;
  const busy = props.busy;
  const error = UI.playError(s, props.selection);
  const rows = [];
  if (c.showBid) {
    rows.push(h("div", { key: "bid", className: "ddz-row" }, c.bidOptions.map(function(option) {
      return h("button", {
        key: option.score,
        type: "button",
        className: "ddz-btn" + (option.score === 0 ? "" : " primary"),
        disabled: !option.enabled || busy,
        onClick: function() {
          act({ type: "bid", score: option.score });
        }
      }, option.label);
    })));
  }
  if (c.showStart) {
    rows.push(h("button", {
      key: "start",
      type: "button",
      className: "ddz-btn primary",
      disabled: busy,
      onClick: function() {
        act({ type: "start" });
      }
    }, "\u5F00\u59CB\u8FD9\u4E00\u5C40"));
  }
  if (c.showPlay) {
    rows.push(h(
      "div",
      { key: "play", className: "ddz-row" },
      h("button", {
        type: "button",
        className: "ddz-btn primary",
        disabled: !c.playEnabled || busy || Boolean(error),
        title: error,
        onClick: function() {
          act({ type: "play", cards: props.selection.slice() });
        }
      }, "\u51FA\u724C"),
      h("button", {
        type: "button",
        className: "ddz-btn",
        disabled: !c.passEnabled || busy,
        title: "\u4E0D\u51FA",
        onClick: function() {
          act({ type: "pass" });
        }
      }, "\u4E0D\u51FA"),
      h("span", { className: "ddz-note" }, error || UI.selectionSummary(props.selection))
    ));
  }
  if (c.showNext) {
    rows.push(h("button", {
      key: "next",
      type: "button",
      className: "ddz-btn primary",
      disabled: busy,
      onClick: function() {
        act({ type: "next" });
      }
    }, "\u4E0B\u4E00\u5C40"));
  }
  return h("div", { className: "ddz-col" }, rows);
}
function ShareBlock(props) {
  const authority = props.state.authority;
  if (!authority) return null;
  const text = UI.shareText(authority);
  const chips = UI.lanChips(authority);
  const hidden = UI.hiddenLanCandidates(authority);
  function bare(url) {
    return String(url).replace(/^https?:\/\//, "");
  }
  return h(
    "div",
    { className: "ddz-col" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u623F\u95F4\u7801"),
      h("span", { className: "ddz-code" }, authority.code)
    ),
    h(
      "div",
      { className: "ddz-urls" },
      chips.map(function(chip) {
        return h("code", {
          key: chip.key,
          title: (chip.iface ? "\u7F51\u5361 " + chip.iface + " \xB7 " : "") + "\u70B9\u51FB\u590D\u5236",
          onClick: function() {
            copy(bare(chip.url));
          }
        }, bare(chip.url));
      }).concat(authority.loopbackUrl ? [h("code", {
        key: "loopback",
        title: "\u672C\u673A\u56DE\u73AF\u5730\u5740\uFF0C\u53EA\u6709\u8FD9\u53F0\u7535\u8111\u80FD\u7528 \xB7 \u70B9\u51FB\u590D\u5236\uFF08\u590D\u5236\u7684\u662F\u7EAF\u5730\u5740\uFF09",
        onClick: function() {
          copy(bare(authority.loopbackUrl));
        }
      }, bare(authority.loopbackUrl) + "\uFF08\u672C\u673A\uFF09")] : [])
    ),
    h("div", { className: "ddz-share", title: "\u70B9\u51FB\u590D\u5236", onClick: function() {
      copy(text);
    } }, text),
    hidden.length ? h(
      "div",
      { className: "ddz-note" },
      "\u5DF2\u9690\u85CF " + hidden.length + " \u4E2A\u865A\u62DF\u7F51\u5361\u5730\u5740\uFF08" + hidden.map(function(entry) {
        return entry.iface;
      }).join("\u3001") + "\uFF09\u2014\u2014 \u90A3\u662F WSL / \u865A\u62DF\u673A / VPN \u7684\u7F51\u5361\uFF0C\u522B\u7684\u7535\u8111\u8FDE\u4E0D\u4E0A\u3002"
    ) : null,
    h("div", { className: "ddz-note" }, "\u628A\u4E0A\u9762\u8FD9\u4E00\u884C\u53D1\u7ED9\u53E6\u5916\u4E24\u5BB6\uFF0C\u4ED6\u4EEC\u5728\u81EA\u5DF1\u7684\u6D6E\u7A97\u91CC\u586B\u5730\u5740\u548C\u623F\u95F4\u7801\u3002")
  );
}
function BotPanel(props) {
  const s = props.snapshot;
  if (!s || !s.isHost) return null;
  const seated = Number(s.botsSeated || 0);
  const capacity = UI.botCapacity(s);
  const level = UI.isBotLevel(s.botLevel) ? s.botLevel : UI.DEFAULT_BOT_LEVEL;
  const countLocked = Boolean(props.busy) || !s.canSetBotCount;
  function setCount(next) {
    act({ type: "bots", level, count: next });
  }
  const chips = h("div", { className: "ddz-chips ddz-grow" }, UI.BOT_LEVELS.map(function(value) {
    return h("button", {
      key: value,
      type: "button",
      className: value === level ? "on" : "",
      disabled: Boolean(props.busy) || !s.canSetBotLevel,
      title: UI.BOT_BLURBS[value],
      // Sending the count that is already there changes only the strength.
      onClick: function() {
        act({ type: "bots", level: value, count: seated });
      }
    }, UI.BOT_LABELS[value]);
  }));
  return h(
    "div",
    { className: "ddz-col" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u7535\u8111"),
      chips
    ),
    h(
      "div",
      { className: "ddz-row" },
      h("button", {
        type: "button",
        className: "ddz-btn sm primary",
        disabled: countLocked || seated >= capacity || capacity === 0,
        title: capacity === 0 ? "\u4E09\u4E2A\u4EBA\u90FD\u662F\u771F\u4EBA\u4E86" : "\u628A\u7A7A\u4F4D\u4EA4\u7ED9\u7535\u8111\uFF0C\u5750\u6EE1\u5C31\u7ACB\u523B\u5F00\u5C40",
        onClick: function() {
          setCount(capacity);
        }
      }, capacity === 0 ? "\u6CA1\u6709\u7A7A\u4F4D" : seated > 0 ? "\u518D\u7528\u7535\u8111\u8865\u9F50" : "\u7528\u7535\u8111\u8865\u9F50\u7A7A\u4F4D"),
      seated > 0 ? h("button", {
        type: "button",
        className: "ddz-btn sm ghost",
        disabled: countLocked,
        title: s.canSetBotCount ? "\u628A\u7535\u8111\u64A4\u4E0B\uFF0C\u7A7A\u4F4D\u7559\u7ED9\u670B\u53CB" : "\u724C\u5C40\u8FDB\u884C\u4E2D\uFF0C\u7B49\u8FD9\u5C40\u7ED3\u675F",
        onClick: function() {
          setCount(0);
        }
      }, "\u64A4\u4E0B\u7535\u8111") : null,
      h("span", { className: "ddz-grow" }),
      h("span", { className: "ddz-note" }, seated > 0 ? "\u5728\u573A " + seated + " \u4E2A" : "\u4E00\u4E2A\u90FD\u6CA1\u4E0A")
    ),
    h("div", { className: "ddz-note" }, UI.BOT_BLURBS[level])
  );
}
function Lobby(props) {
  const state = props.state;
  const [mode, setMode] = React.useState("host");
  const [name, setName] = React.useState(props.prefs.name || state.playerName || "");
  const [port, setPort] = React.useState(String(state.defaults && state.defaults.port || 8791));
  const [address, setAddress] = React.useState("");
  const [code, setCode] = React.useState("");
  const [note, setNote] = React.useState("");
  const [local, setLocal] = React.useState("");
  function remember(next) {
    props.setPrefs({ name: String(next || "").trim().slice(0, 12) });
  }
  function onHost() {
    props.setPrefs({ name: String(name || "").trim().slice(0, 12) });
    post("host", {
      port: Number(port) || 0,
      name: String(name || "").trim(),
      botLevel: props.prefs.botLevel
    });
  }
  function onJoin() {
    const base = UI.normaliseAddress(address);
    if (!base) {
      setLocal("\u5148\u586B\u623F\u4E3B\u5730\u5740");
      return;
    }
    if (!/^[A-Za-z0-9]{4,8}$/.test(String(code).trim())) {
      setLocal("\u623F\u95F4\u7801\u662F 6 \u4F4D\u5B57\u6BCD\u6570\u5B57");
      return;
    }
    props.setPrefs({ name: String(name || "").trim().slice(0, 12) });
    setLocal("");
    post("join", { url: base, code: String(code).trim().toUpperCase(), name: String(name || "").trim() });
  }
  function onProbe() {
    const base = UI.normaliseAddress(address);
    if (!base) {
      setLocal("\u5148\u586B\u623F\u4E3B\u5730\u5740");
      return;
    }
    setLocal("");
    post("probe", { url: base }).then(function(result) {
      const data = result && result.data;
      setNote(data && data.ok ? `\u8FDE\u4E0A\u4E86\uFF0C\u623F\u95F4 ${data.hello && data.hello.code ? data.hello.code : ""}` : "\u8FDE\u4E0D\u4E0A\uFF0C\u68C0\u67E5\u5730\u5740\u548C\u9632\u706B\u5899");
    });
  }
  const tabs = h(
    "div",
    { className: "ddz-tabs" },
    h("button", { type: "button", className: mode === "host" ? "on" : "", onClick: function() {
      setMode("host");
    } }, "\u6211\u5F00\u623F"),
    h("button", { type: "button", className: mode === "join" ? "on" : "", onClick: function() {
      setMode("join");
    } }, "\u6211\u52A0\u5165")
  );
  const nameRow = h(
    "div",
    { className: "ddz-row" },
    h("span", { className: "ddz-label" }, "\u6635\u79F0"),
    h("input", {
      className: "ddz-input ddz-grow",
      value: name,
      maxLength: 12,
      placeholder: "\u53E6\u5916\u4E24\u5BB6\u4F1A\u770B\u5230",
      onChange: function(event) {
        setName(event.target.value);
      },
      onBlur: function() {
        remember(name);
      }
    })
  );
  const hostRow = mode === "host" ? h(
    "div",
    { className: "ddz-col" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u7AEF\u53E3"),
      h("input", {
        className: "ddz-input",
        style: { width: "86px" },
        value: port,
        inputMode: "numeric",
        onChange: function(event) {
          setPort(event.target.value.replace(/[^0-9]/g, ""));
        }
      }),
      h("button", { type: "button", className: "ddz-btn primary", disabled: props.busy, onClick: onHost }, "\u5F00\u623F")
    ),
    h("div", { className: "ddz-note" }, "\u5F00\u623F\u540E\u8FD9\u53F0\u673A\u5668\u4F1A\u6210\u4E3A\u6743\u5A01\uFF0C\u7AEF\u53E3\u53EA\u5728\u724C\u5C40\u671F\u95F4\u6253\u5F00\u3002"),
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u4EBA\u673A"),
      h("div", { className: "ddz-chips ddz-grow" }, UI.BOT_LEVELS.map(function(value) {
        return h("button", {
          key: value,
          type: "button",
          className: value === props.prefs.botLevel ? "on" : "",
          title: UI.BOT_BLURBS[value],
          onClick: function() {
            props.setPrefs({ botLevel: value });
          }
        }, UI.BOT_LABELS[value]);
      }))
    ),
    h("div", { className: "ddz-note" }, "\u8FD9\u662F\u8865\u4F4D\u7535\u8111\u7684\u5F3A\u5EA6\uFF1A\u5F00\u623F\u540E\u70B9\u300C\u7528\u7535\u8111\u8865\u9F50\u7A7A\u4F4D\u300D\uFF0C\u4E00\u4E2A\u4EBA\u4E5F\u80FD\u5F00\u5C40\u3002")
  ) : h(
    "div",
    { className: "ddz-col" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u5730\u5740"),
      h("input", {
        className: "ddz-input ddz-grow",
        value: address,
        placeholder: "192.168.1.50:8791",
        onChange: function(event) {
          setAddress(event.target.value);
        }
      })
    ),
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u623F\u95F4\u7801"),
      h("input", {
        className: "ddz-input ddz-grow",
        value: code,
        maxLength: 8,
        placeholder: "6 \u4F4D",
        onChange: function(event) {
          setCode(event.target.value.toUpperCase());
        }
      }),
      h("button", { type: "button", className: "ddz-btn", disabled: props.busy, onClick: onProbe }, "\u68C0\u67E5"),
      h("button", { type: "button", className: "ddz-btn primary", disabled: props.busy, onClick: onJoin }, "\u52A0\u5165")
    ),
    note ? h("div", { className: "ddz-note" }, note) : null
  );
  return h(
    "div",
    { className: "ddz-col" },
    tabs,
    nameRow,
    hostRow,
    local ? h("div", { className: "ddz-err" }, local) : null,
    state.lastError ? h("div", { className: "ddz-err" }, state.lastError) : null
  );
}
function StatusPanel(props) {
  const state = props.state;
  const s = state.snapshot;
  const controls = UI.controlsFor(s);
  const status = s ? UI.statusLine(s, controls) : "";
  const me = s ? s.you : null;
  const identity = h(
    "div",
    { className: "ddz-row" },
    h("span", { className: "ddz-badge" }, state.role === "host" ? "\u623F\u4E3B" : "\u5BA2\u4EBA"),
    me ? h("span", { className: "ddz-badge " + (me.role || "") }, UI.roleLabel(me.role) || "\u672A\u5B9A") : null,
    s ? h("span", { className: "ddz-note" }, "\u7B2C " + s.handNo + " \u5C40") : null,
    h("span", { className: "ddz-grow" }),
    h("button", {
      type: "button",
      className: "ddz-btn sm ghost",
      disabled: props.busy,
      onClick: function() {
        selection = [];
        post("leave", {});
      }
    }, "\u6563\u5C40")
  );
  const seats = s ? h("div", { className: "ddz-seats" }, (s.seats || []).map(function(info) {
    return h(SeatRow, { key: info.seat, seat: info.seat, snapshot: s, youSeat: s.you.seat, wide: info.seat === s.you.seat });
  })) : null;
  return h(
    "div",
    { className: "ddz-col" },
    identity,
    status ? h("div", { className: "ddz-note" }, status) : null,
    state.role === "host" ? h(ShareBlock, { state }) : null,
    s ? h(BotPanel, { snapshot: s, busy: props.busy }) : null,
    state.role === "guest" && state.guest ? h("div", { className: "ddz-note" }, "\u5DF2\u8FDE\u4E0A " + String(state.guest.baseUrl).replace(/^https?:\/\//, "") + "\uFF0C" + (state.guest.seat + 1) + " \u53F7\u4F4D") : null,
    seats,
    // The authority reveals every hand once the hand is over; that review screen
    // is the whole point of revealing them, so show them here rather than only
    // sending the data.
    s && s.secretsRevealed ? h(
      "div",
      { className: "ddz-col" },
      h("div", { className: "ddz-label" }, "\u590D\u76D8 \xB7 \u4E09\u5BB6\u624B\u724C"),
      (s.seats || []).filter(function(info) {
        return info.seat !== s.you.seat && Array.isArray(info.hand);
      }).map(function(info) {
        return h(
          "div",
          { key: "reveal-" + info.seat, className: "ddz-play" },
          h("span", { className: "ddz-play-who" }, info.name),
          h(Hand, { ids: info.hand, mini: true })
        );
      })
    ) : null,
    s ? h(Felt, { snapshot: s }) : null,
    h("div", { className: "ddz-divider" }),
    s && me ? h(ActionRow, { snapshot: s, controls, selection: props.selection, busy: props.busy }) : null,
    s && me ? h(Hand, {
      ids: me.hand,
      selection: props.selection,
      mini: props.mini,
      empty: "\u624B\u724C\u8FD8\u6CA1\u53D1",
      onToggle: controls.playEnabled ? function(id) {
        props.setSelection(UI.toggleSelection(props.selection, id));
      } : void 0
    }) : null
  );
}
function HistoryPanel(props) {
  const s = props.snapshot;
  if (!s) return h("div", { className: "ddz-empty" }, "\u8FD8\u6CA1\u6709\u8BB0\u5F55");
  const plays = UI.playEntries(s);
  const events = UI.logEntries(s);
  return h(
    "div",
    { className: "ddz-col" },
    h("div", { className: "ddz-label" }, "\u51FA\u724C\u8BB0\u5F55"),
    plays.length ? h("div", { className: "ddz-log" }, plays.map(function(entry) {
      return h("div", { key: entry.key, className: "ddz-log-item" }, h("span", {}, entry.text));
    })) : h("div", { className: "ddz-empty" }, "\u8FD8\u6CA1\u4EBA\u51FA\u724C"),
    h("div", { className: "ddz-divider" }),
    h("div", { className: "ddz-label" }, "\u623F\u95F4\u4E8B\u4EF6"),
    events.length ? h("div", { className: "ddz-log" }, events.map(function(entry) {
      return h("div", { key: entry.key, className: "ddz-log-item" }, h("span", {}, entry.text));
    })) : h("div", { className: "ddz-empty" }, "\u8FD8\u6CA1\u6709\u4E8B\u4EF6")
  );
}
function Body(props) {
  const state = props.state;
  if (!state) return h("div", { className: "ddz-empty" }, "\u6B63\u5728\u8FDE\u63A5\u672C\u673A\u63D2\u4EF6\u2026");
  if (state.role === "idle") {
    return h(Lobby, { state, prefs: props.prefs, setPrefs: props.setPrefs, busy: props.busy });
  }
  if (props.pane === "log") return h(HistoryPanel, { snapshot: state.snapshot });
  return h(StatusPanel, {
    state,
    busy: props.busy,
    selection: props.selection,
    setSelection: props.setSelection,
    mini: props.mini
  });
}
function Notices(props) {
  const state = props.state || {};
  const lines = [];
  if (props.error) lines.push(["net", "\u8FDE\u4E0D\u4E0A\u672C\u673A\u63D2\u4EF6\uFF1A" + props.error]);
  if (props.actionError) lines.push(["act", props.actionError]);
  if (state.lastError && state.role === "idle") lines.push(["state", state.lastError]);
  if (!lines.length) return null;
  return h("div", { className: "ddz-col" }, lines.map(function(line) {
    return h("div", { key: line[0], className: "ddz-err" }, line[1]);
  }));
}
function useTurn(state) {
  const s = state && state.snapshot;
  return Boolean(s && (s.canAct || s.canBid));
}
function MiniWindow() {
  const view = useStore();
  const [prefs, setPrefs] = usePrefs();
  const [selectionState, setSelection] = React.useState(selection);
  const [live, setLive] = React.useState(null);
  const [drag, setDrag] = React.useState(null);
  const [box, setBox] = React.useState(null);
  const boxRef = React.useRef(null);
  const state = view.data;
  const snapshot = state && state.snapshot;
  const myTurn = useTurn(state);
  const collapsed = prefs.collapsed;
  React.useEffect(function() {
    setSelection(selection.slice());
  }, [view]);
  const setSelectionAndStore = React.useCallback(function(next) {
    selection = next;
    setSelection(next);
  }, []);
  React.useEffect(function() {
    setPeriod(collapsed ? POLL_MS_QUIET : POLL_MS);
  }, [collapsed]);
  React.useLayoutEffect(function() {
    const node = boxRef.current;
    if (!node || typeof node.getBoundingClientRect !== "function") return;
    const rect = node.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    setBox(function(previous) {
      if (previous && Math.abs(previous.width - rect.width) < 1 && Math.abs(previous.height - rect.height) < 1) {
        return previous;
      }
      return { width: rect.width, height: rect.height };
    });
  });
  const size = collapsed ? { width: PILL_W, height: 30 } : box || { width: UI.MINI_W, height: UI.MINI_H };
  const placed = live || UI.clampPosition(prefs.x, prefs.y, viewport(), size);
  function onPointerDown(event) {
    if (event.button !== 0) return;
    const box2 = boxRef.current ? boxRef.current.getBoundingClientRect() : null;
    if (!box2) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
    }
    setDrag({ x: event.clientX, y: event.clientY, left: box2.left, top: box2.top });
  }
  function onPointerMove(event) {
    if (!drag) return;
    setLive(UI.clampPosition(
      drag.left + (event.clientX - drag.x),
      drag.top + (event.clientY - drag.y),
      viewport(),
      size
    ));
  }
  function onPointerUp() {
    if (!drag) return;
    setDrag(null);
    if (live) {
      setPrefs({ x: live.x, y: live.y });
      setLive(null);
    }
  }
  function stop(event) {
    event.stopPropagation();
  }
  if (collapsed) {
    return h(
      "button",
      {
        type: "button",
        ref: boxRef,
        className: "ddz-pill" + (myTurn ? " turn" : ""),
        style: { left: placed.x + "px", top: placed.y + "px" },
        title: "\u5C55\u5F00\u6597\u5730\u4E3B\u6D6E\u7A97",
        onClick: function() {
          setPrefs({ collapsed: false });
        },
        onPointerDown,
        onPointerMove,
        onPointerUp
      },
      h("span", { className: "ddz-dot" }),
      h("span", {}, "\u6597\u5730\u4E3B \xB7 " + (myTurn ? "\u8BE5\u4F60\u4E86" : snapshot ? UI.phaseLabel(snapshot.phase) : "\u672A\u8FDB\u684C"))
    );
  }
  const stateLabel = !state ? "\u8FDE\u63A5\u4E2D" : state.role === "idle" ? "\u672A\u8FDB\u684C" : snapshot ? UI.phaseLabel(snapshot.phase) : "\u5DF2\u8FDE\u63A5";
  return h(
    "div",
    {
      ref: boxRef,
      className: "ddz-mini" + (drag ? " dragging" : ""),
      style: { left: placed.x + "px", top: placed.y + "px" }
    },
    h(
      "div",
      Object.assign({
        className: "ddz-mini-bar" + (drag ? " dragging" : ""),
        title: "\u62D6\u52A8\u53EF\u79FB\u52A8 \xB7 \u53CC\u51FB\u6536\u8D77",
        onDoubleClick: function() {
          setPrefs({ collapsed: true });
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
      }),
      h("span", {}, "\u{1F0CF}"),
      h("span", { className: "ddz-mini-title" }, "\u6597\u5730\u4E3B"),
      h("span", { className: "ddz-mini-meta" }, myTurn ? "\u8BE5\u4F60\u4E86" : stateLabel),
      h("button", {
        type: "button",
        className: "ddz-ico-btn",
        title: "\u6536\u8D77\u4E3A\u60AC\u6D6E\u6309\u94AE",
        onPointerDown: stop,
        onClick: function() {
          setPrefs({ collapsed: true });
        }
      }, "\u2014")
    ),
    h(
      "div",
      { className: "ddz-mini-body" },
      h(Notices, { state, error: view.error, actionError: view.actionError }),
      h(Body, {
        state,
        pane: prefs.pane,
        prefs,
        setPrefs,
        busy: view.busy,
        selection: selectionState,
        setSelection: setSelectionAndStore,
        mini: true
      })
    ),
    h(
      "div",
      { className: "ddz-mini-foot" },
      h(
        "div",
        { className: "ddz-tabs ddz-grow" },
        h("button", {
          type: "button",
          className: prefs.pane === "table" ? "on" : "",
          onClick: function() {
            setPrefs({ pane: "table" });
          }
        }, "\u724C\u684C"),
        h("button", {
          type: "button",
          className: prefs.pane === "log" ? "on" : "",
          onClick: function() {
            setPrefs({ pane: "log" });
          }
        }, "\u8BB0\u5F55")
      )
    )
  );
}
function TableView() {
  const view = useStore();
  const [prefs, setPrefs] = usePrefs();
  const [selectionState, setSelection] = React.useState(selection);
  const state = view.data;
  const snapshot = state && state.snapshot;
  React.useEffect(function() {
    setSelection(selection.slice());
  }, [view]);
  const setSelectionAndStore = React.useCallback(function(next) {
    selection = next;
    setSelection(next);
  }, []);
  const controls = UI.controlsFor(snapshot);
  return h(
    "div",
    { className: "ddz-view" },
    h(
      "div",
      { className: "ddz-view-head" },
      h("h2", {}, "\u6597\u5730\u4E3B"),
      state ? h("span", { className: "ddz-badge" }, state.role === "host" ? "\u623F\u4E3B" : state.role === "guest" ? "\u5BA2\u4EBA" : "\u672A\u8FDB\u684C") : null,
      snapshot ? h("span", { className: "ddz-badge" }, UI.phaseLabel(snapshot.phase)) : null,
      snapshot ? h("span", { className: "ddz-note" }, UI.statusLine(snapshot, controls)) : null,
      h("span", { className: "ddz-grow" }),
      h("button", {
        type: "button",
        className: "ddz-btn sm",
        onClick: function() {
          setPrefs({ collapsed: !prefs.collapsed });
        }
      }, prefs.collapsed ? "\u5C55\u5F00\u6D6E\u7A97" : "\u6536\u8D77\u6D6E\u7A97")
    ),
    h(Notices, { state, error: view.error, actionError: view.actionError }),
    h(
      "div",
      { className: "ddz-row", style: { alignItems: "flex-start", gap: "20px" } },
      h(
        "div",
        { style: { flex: "1 1 340px", minWidth: "300px" } },
        h(Body, {
          state,
          pane: "table",
          prefs,
          setPrefs,
          busy: view.busy,
          selection: selectionState,
          setSelection: setSelectionAndStore
        })
      ),
      h(
        "div",
        { style: { flex: "1 1 320px", minWidth: "280px" } },
        h(HistoryPanel, { snapshot })
      )
    )
  );
}
function warn(what, error) {
  if (typeof console !== "undefined" && console.warn) {
    console.warn("[dsh-doudizhu] " + what + "\uFF1Bhost \u534A\u533A\u4ECD\u7136\u53EF\u7528", error);
  }
}
function apply(ctx) {
  ctx.effect(function() {
    return function() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      listeners.clear();
      store = { data: null, error: "", actionError: "", busy: false, at: 0 };
      selection = [];
      lastPhase = void 0;
      inflight = false;
    };
  }, "dsh-doudizhu: poller");
  ctx.effect(function() {
    const style = document.createElement("style");
    style.dataset.plugin = "dsh-doudizhu";
    style.textContent = CSS;
    document.head.appendChild(style);
    return function() {
      style.remove();
    };
  }, "dsh-doudizhu: styles");
  ctx.slots.inject("shell.overlay", function() {
    let dispose;
    try {
      dispose = ctx.slots.register({ name: "shell.overlay", id: "doudizhu-mini", order: 30 }, MiniWindow);
    } catch (error) {
      warn("\u6D6E\u7A97\u6CA1\u6CE8\u518C\u4E0A", error);
    }
    return typeof dispose === "function" ? dispose : function() {
    };
  });
  ctx.slots.inject("conversation.view", function() {
    let dispose;
    try {
      dispose = ctx.slots.register({ name: "conversation.view", id: "doudizhu", order: 30, label: "\u6597\u5730\u4E3B" }, TableView);
    } catch (error) {
      warn("\u6597\u5730\u4E3B\u6807\u7B7E\u9875\u6CA1\u6CE8\u518C\u4E0A", error);
    }
    return typeof dispose === "function" ? dispose : function() {
    };
  });
}
module.exports = {
  name: "dsh-doudizhu",
  inject: ["slots"],
  apply
};
    return module.exports;
  },
});
