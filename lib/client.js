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
  background:var(--dsw-alias-bg-layer-2,#26262e);color:var(--dsw-alias-label-primary,#eee);cursor:pointer;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));box-shadow:0 6px 18px rgba(0,0,0,.35);
  font-size:12px;pointer-events:auto;user-select:none;font-family:inherit;touch-action:none;
  transition:border-color .15s ease,transform .15s ease,box-shadow .15s ease}
.ddz-pill:hover{border-color:var(--dsw-alias-brand-primary,#4a7dff);transform:translateY(-1px);
  box-shadow:0 8px 22px rgba(0,0,0,.4)}
.ddz-pill:active{transform:translateY(0)}
.ddz-pill.turn{box-shadow:0 6px 18px rgba(0,0,0,.35),0 0 0 1px var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-pill .ddz-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary,#888)}
.ddz-pill.turn .ddz-dot{background:var(--dsw-alias-state-success-primary,#3ecf72);animation:ddz-blink 1.5s ease-in-out infinite}
@keyframes ddz-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.8)}}

.ddz-mini{position:fixed;z-index:60;display:flex;flex-direction:column;width:344px;max-height:88vh;
  background:var(--dsw-alias-bg-layer-2,#26262e);color:var(--dsw-alias-label-primary,#eee);
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:14px;
  box-shadow:0 20px 48px rgba(0,0,0,.42),0 2px 8px rgba(0,0,0,.2);pointer-events:auto;overflow:hidden;
  font-family:inherit;font-size:13px;line-height:1.5}
.ddz-mini-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;user-select:none;touch-action:none;
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.04));border-bottom:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.ddz-mini-bar.dragging{cursor:grabbing}
/* While a drag is live the whole box stops selecting text under the pointer. */
.ddz-mini.dragging{user-select:none}
.ddz-mini-title{font-weight:600;letter-spacing:.01em}
.ddz-mini-meta{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-ico-btn{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:6px;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));background:transparent;color:inherit;
  cursor:pointer;font-size:13px;line-height:1;padding:0;transition:background .15s ease,transform .08s ease}
.ddz-ico-btn:hover{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08))}
.ddz-ico-btn:active{transform:scale(.92)}
.ddz-mini-body{padding:9px;overflow:auto;display:flex;flex-direction:column;gap:7px;flex:0 1 auto;min-height:0}
/* The docked hand + buttons: fixed under the scrolling table, so playing never
   needs a scroll. The table above it is the part that scrolls on a tall hand. */
.ddz-dock{display:flex;flex-direction:column;gap:6px}
.ddz-dock-bar{padding:7px 9px 9px;display:flex;flex-direction:column;gap:6px;flex:0 0 auto;
  background:var(--dsw-alias-bg-layer-2,#26262e);
  border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10))}
.ddz-mini-foot{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.1))}

.ddz-view{display:flex;flex-direction:column;gap:14px;padding:20px;height:100%;box-sizing:border-box;
  color:var(--dsw-alias-label-primary,#eee);overflow:auto;font-family:inherit;font-size:14px}
.ddz-view-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.ddz-view h2{margin:0;font-size:17px;letter-spacing:.01em}

.ddz-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ddz-col{display:flex;flex-direction:column;gap:8px}
.ddz-grow{flex:1;min-width:0}
.ddz-note{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-err{font-size:12px;color:var(--dsw-alias-state-error-primary,#ff6b6b);white-space:pre-wrap;word-break:break-word}
.ddz-ok{font-size:12px;color:var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-secondary,#9aa)}

.ddz-input,.ddz-select{padding:5px 8px;border-radius:7px;font:inherit;font-size:13px;min-width:0;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));color:inherit;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.16));
  transition:border-color .15s ease,box-shadow .15s ease}
.ddz-input:hover,.ddz-select:hover{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.22))}
.ddz-input:focus,.ddz-select:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4a7dff);
  box-shadow:0 0 0 3px var(--dsw-alias-border-l1,rgba(255,255,255,.14))}
.ddz-btn{padding:5px 12px;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08));color:inherit;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.16));
  transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .08s ease,opacity .15s ease}
.ddz-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary,#4a7dff);
  box-shadow:0 2px 10px rgba(0,0,0,.16)}
.ddz-btn:active:not(:disabled){transform:translateY(1px)}
.ddz-btn:disabled{opacity:.42;cursor:not-allowed}
.ddz-btn.primary{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;
  color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base,#111))}
.ddz-btn.primary:hover:not(:disabled){box-shadow:0 3px 14px rgba(0,0,0,.24);border-color:transparent}
.ddz-btn.ghost{background:transparent}
.ddz-btn.sm{padding:3px 9px;font-size:12px}

.ddz-badge{font-size:10px;padding:1px 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.22));
  color:var(--dsw-alias-label-secondary,#9aa);white-space:nowrap}
.ddz-badge.landlord{color:var(--dsw-alias-state-warn-primary,#ffcf5c);border-color:currentColor}
.ddz-badge.farmer{color:var(--dsw-alias-state-success-primary,#8fd6a0);border-color:currentColor}
.ddz-badge.turn{color:var(--dsw-alias-state-success-primary,#3ecf72);border-color:currentColor}
.ddz-badge.gone{color:var(--dsw-alias-state-error-primary,#ff6b6b);border-color:currentColor}

.ddz-seats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ddz-seat-card{display:flex;flex-direction:column;gap:3px;padding:5px 7px 6px;border-radius:9px;min-width:0;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05));
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));
  transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
.ddz-seat-card.me{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.09))}
.ddz-seat-card.active{border-color:var(--dsw-alias-state-success-primary,#3ecf72);
  box-shadow:0 0 0 1px var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-seat-top{display:flex;align-items:center;gap:4px;min-width:0}
.ddz-ava{width:18px;height:18px;flex:0 0 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:600;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.10));
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.20));color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-seat-card.active .ddz-ava{border-color:var(--dsw-alias-state-success-primary,#3ecf72);color:inherit}
.ddz-seat-name{flex:1;min-width:0;font-weight:600;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddz-seat-order{flex:0 0 auto;font-size:9px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-seat-line{display:flex;align-items:center;gap:4px;min-width:0}
.ddz-seat-count{font-size:10px;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums;white-space:nowrap}
.ddz-seat-count b{font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary,#eee)}
.ddz-seat-idle{opacity:.7}
.ddz-seat-note{font-size:9px;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums;white-space:nowrap}
.ddz-seat-card .ddz-badge{font-size:9px;padding:0 4px}
.ddz-meter{height:3px;border-radius:999px;overflow:hidden;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.10))}
/* The fill carries no text, but it is a brand fill: the on-brand token keeps the
   theme guard (and any label added later) honest. */
.ddz-meter-fill{display:block;height:100%;border-radius:999px;
  background:var(--dsw-alias-brand-primary,#4a7dff);
  color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base,#111));
  transition:width .25s ease}
.ddz-meter-fill.low{background:var(--dsw-alias-state-warn-primary,#ffcf5c)}
/* The felt answers exactly one question: what am I beating? Everything that
   does not answer it stays out of this block. */
.ddz-felt{border-radius:11px;padding:7px 8px;display:flex;flex-direction:column;gap:5px;
  background:linear-gradient(180deg,var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05)),transparent);
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12))}
.ddz-felt-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ddz-felt-label{font-size:11px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-felt-pass{font-size:11px;color:var(--dsw-alias-state-warn-primary,#ffcf5c);font-variant-numeric:tabular-nums}
.ddz-felt-note{font-size:10px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-felt-cards{display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-height:32px}
.ddz-felt-bottom{font-size:10px;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums;white-space:nowrap}

/* Play history: a folded strip under the felt. The summary is always readable,
   the detail opens in place \u2014 switching to a \u8BB0\u5F55 tab used to lose the table. */
.ddz-history{border-radius:10px;overflow:hidden;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04))}
.ddz-history-head{display:flex;align-items:center;gap:7px;width:100%;padding:6px 9px;box-sizing:border-box;
  font:inherit;font-size:12px;cursor:pointer;text-align:left;
  background:transparent;color:inherit;border:0;transition:background .15s ease}
.ddz-history-head:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07))}
.ddz-history-head:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#eee);outline-offset:-2px}
.ddz-chev{width:10px;font-size:10px;color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-history-title{font-weight:600}
.ddz-history-body{max-height:200px;overflow:auto;padding:2px 9px 8px;display:flex;flex-direction:column;gap:6px;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10))}
.ddz-history-body.static{max-height:none;border-top:0;padding:0;overflow:visible}
.ddz-trick{border-radius:8px;padding:5px 7px;display:flex;flex-direction:column;gap:2px;
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.06));border:1px solid transparent}
.ddz-trick.latest{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.20))}
.ddz-trick-head{display:flex;align-items:center;gap:6px;font-size:10px;
  color:var(--dsw-alias-label-secondary,#9aa);margin-bottom:2px}
.ddz-trick-no{letter-spacing:.04em;font-variant-numeric:tabular-nums}
.ddz-turn{display:grid;grid-template-columns:74px 1fr auto;gap:6px;align-items:baseline;font-size:12px;padding:1px 0}
.ddz-turn-who{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-turn-what{font-variant-numeric:tabular-nums;word-break:break-word}
/* A pass is the quiet line in the record: dimmed as a whole, so the tricks that
   actually moved cards are what the eye lands on. */
.ddz-turn.pass{opacity:.55}
.ddz-turn.pass .ddz-turn-what{color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-turn-shape{font-size:10px;color:var(--dsw-alias-label-secondary,#9aa);white-space:nowrap}

/* The room's own status line: quiet, but the only place that knows whose turn it
   is, so it sits right under the identity row instead of in a red error slot. */
.ddz-status{font-size:12px;padding:4px 9px;border-radius:0 8px 8px 0;
  color:var(--dsw-alias-label-primary,#eee);
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05));
  border-left:2px solid var(--dsw-alias-brand-primary,#4a7dff)}
/* \u63D0\u793A/\u5E2E\u6211\u51FA are helpers, not a second primary action: they keep the plain
   secondary weight so the row has exactly one strong button (\u51FA\u724C). */
.ddz-btn.hint,.ddz-btn.hint-play{color:var(--dsw-alias-label-secondary,#9aa)}
.ddz-btn.hint:hover:not(:disabled),.ddz-btn.hint-play:hover:not(:disabled){color:var(--dsw-alias-label-primary,#eee)}
.ddz-advice{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums}
.ddz-warn{color:var(--dsw-alias-state-error-primary,#ff6b6b)}
.ddz-count-note{font-variant-numeric:tabular-nums}
.ddz-play{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}
.ddz-play-who{color:var(--dsw-alias-label-secondary,#9aa);min-width:52px}
.ddz-empty{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa)}

.ddz-hand{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;min-height:52px}
/* A card reads top-left like a real one: rank over suit in the corner. Centring
   the pair made a 24px-wide card look like a number with a speck under it. */
.ddz-card{width:34px;height:48px;border-radius:7px;display:flex;flex-direction:column;
  align-items:flex-start;justify-content:flex-start;cursor:pointer;user-select:none;padding:2px 0 0 4px;
  box-sizing:border-box;font:inherit;text-align:left;
  background:linear-gradient(180deg,var(--dsw-alias-bg-layer-2,#26262e),var(--dsw-alias-bg-layer-1,#202027));
  color:var(--dsw-alias-label-primary,#eee);box-shadow:0 1px 2px rgba(0,0,0,.28);
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.22));
  transition:transform .1s ease,box-shadow .1s ease,border-color .1s ease}
.ddz-card:hover{transform:translateY(-4px);box-shadow:0 6px 14px rgba(0,0,0,.3)}
.ddz-card:active{transform:translateY(-2px) scale(.97)}
.ddz-card .ddz-rank{font-size:14px;font-weight:700;line-height:1.05;letter-spacing:0}
.ddz-card .ddz-suit{font-size:12px;line-height:1;margin-top:-1px}
.ddz-card.red{color:var(--dsw-alias-state-error-primary,#ff6b6b)}
.ddz-card.joker .ddz-rank{font-size:11px}
.ddz-card.joker.big{color:var(--dsw-alias-state-warn-primary,#ffcf5c)}
.ddz-card.sel{transform:translateY(-10px);border-color:var(--dsw-alias-brand-primary,#4a7dff);
  box-shadow:0 0 0 2px var(--dsw-alias-brand-primary,#4a7dff),0 8px 18px rgba(0,0,0,.32)}
.ddz-card.mini{width:24px;height:34px;padding:1px 0 0 3px}
.ddz-card.mini .ddz-rank{font-size:11px}
.ddz-card.mini .ddz-suit{font-size:9px;margin-top:0}

.ddz-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.14em;font-weight:700}
/* Room setup: one folded strip. During a hand the table is what matters; in the
   lobby the strip is open, because that is where a room gets filled. */
.ddz-room{border-radius:10px;overflow:hidden;
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10));
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.04))}
.ddz-room-head{display:flex;align-items:center;gap:6px;width:100%;padding:6px 9px;box-sizing:border-box;
  font:inherit;font-size:12px;cursor:pointer;text-align:left;background:transparent;color:inherit;border:0;
  transition:background .15s ease}
.ddz-room-head:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.07))}
.ddz-room-head:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#eee);outline-offset:-2px}
.ddz-room-title{font-weight:600;white-space:nowrap}
.ddz-room-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:700;
  letter-spacing:.1em;padding:1px 6px;border-radius:6px;
  background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.10))}
.ddz-room-addr{font-size:11px;color:var(--dsw-alias-label-secondary,#9aa);
  font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px}
.ddz-room-body{padding:2px 9px 9px;display:flex;flex-direction:column;gap:7px;
  border-top:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.10))}
.ddz-share-block{display:flex;flex-direction:column;gap:5px;padding-top:2px}
.ddz-where{align-items:center}
.ddz-url{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;padding:2px 6px;border-radius:5px;
  cursor:pointer;background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.08));
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12));color:inherit;white-space:nowrap;
  transition:background .15s ease}
.ddz-url:hover{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.14))}
.ddz-tabs{display:flex;gap:4px}
.ddz-tabs button{flex:1;padding:4px 0;font:inherit;font-size:12px;cursor:pointer;border-radius:7px;
  background:transparent;color:var(--dsw-alias-label-secondary,#9aa);border:1px solid transparent;
  transition:background .15s ease,color .15s ease,border-color .15s ease}
.ddz-tabs button:hover:not(.on){color:var(--dsw-alias-label-primary,#eee)}
.ddz-tabs button.on{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.08));color:inherit;
  border-color:var(--dsw-alias-border-l1,rgba(255,255,255,.14))}
.ddz-log{display:flex;flex-direction:column;gap:4px;font-size:12px}
.ddz-log-item{display:flex;gap:6px;align-items:baseline}
.ddz-log-item .ddz-at{color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums}
.ddz-divider{height:1px;background:var(--dsw-alias-border-l1,rgba(255,255,255,.1))}
.ddz-chips{display:flex;gap:4px}
.ddz-chips button{flex:1;padding:4px 0;font:inherit;font-size:12px;cursor:pointer;border-radius:7px;
  background:transparent;color:var(--dsw-alias-label-secondary,#9aa);
  border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));
  transition:background .15s ease,color .15s ease,border-color .15s ease}
.ddz-chips button:hover:not(.on):not(:disabled){color:var(--dsw-alias-label-primary,#eee);
  border-color:var(--dsw-alias-brand-primary,#4a7dff)}
.ddz-chips button.on{background:var(--dsw-alias-brand-primary,#4a7dff);border-color:transparent;
  color:var(--dsw-alias-label-primary-foreground,var(--dsw-alias-bg-base,#111))}
.ddz-chips button:disabled{opacity:.45;cursor:not-allowed}
.ddz-badge.bot{color:#9ecbff;border-color:currentColor}

/* Keyboard users get a ring that follows the theme instead of the browser's
   default, which can vanish on a themed surface. */
.ddz-pill:focus-visible,.ddz-btn:focus-visible,.ddz-ico-btn:focus-visible,.ddz-tabs button:focus-visible,
.ddz-chips button:focus-visible,.ddz-card:focus-visible,.ddz-url:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#eee);outline-offset:2px}

/* Thin, theme-coloured scrollbars in the two scrolling panes. */
.ddz-mini-body,.ddz-view{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2,rgba(255,255,255,.22)) transparent}
.ddz-mini-body::-webkit-scrollbar,.ddz-view::-webkit-scrollbar{width:8px;height:8px}
.ddz-mini-body::-webkit-scrollbar-thumb,.ddz-view::-webkit-scrollbar-thumb{
  background:var(--dsw-alias-border-l2,rgba(255,255,255,.22));border-radius:8px;border:2px solid transparent;background-clip:padding-box}
.ddz-mini-body::-webkit-scrollbar-track,.ddz-view::-webkit-scrollbar-track{background:transparent}

@media (prefers-reduced-motion: reduce){
  .ddz-pill,.ddz-btn,.ddz-ico-btn,.ddz-card,.ddz-seat-card,.ddz-meter-fill,.ddz-tabs button,.ddz-chips button,.ddz-input,.ddz-select{transition:none}
  .ddz-pill.turn .ddz-dot{animation:none}
  .ddz-pill:hover,.ddz-card:hover,.ddz-card.sel,.ddz-card:active,.ddz-btn:active:not(:disabled){transform:none}
}
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
function sortCardIds(ids = []) {
  return [...ids].sort((leftId, rightId) => {
    const left = cardFromId(leftId);
    const right = cardFromId(rightId);
    if (!left || !right) return String(leftId).localeCompare(String(rightId));
    if (left.value !== right.value) return right.value - left.value;
    return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
  });
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
function moveKey(move2) {
  if (!move2) return "";
  return `${move2.type}:${move2.size}:${move2.mainValue}:${move2.sequenceLength}`;
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
var RANKS, SUITS, SUIT_SYMBOLS, RANK_VALUES, JOKER_VALUES, SMALL_JOKER, BIG_JOKER, MAX_SEQUENCE_VALUE, MIN_STRAIGHT, MIN_PAIR_STRAIGHT, MIN_PLANE, MOVE_LABELS, BID_LABELS, GENERATION_CACHE, CACHE_LIMIT;
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
    GENERATION_CACHE = /* @__PURE__ */ new Map();
    CACHE_LIMIT = 6e3;
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
  MAX_NICK: () => MAX_NICK,
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
  hintMoves: () => hintMoves,
  historySummary: () => historySummary,
  isBotLevel: () => isBotLevel,
  lanChips: () => lanChips,
  logEntries: () => logEntries,
  nicknameNote: () => nicknameNote,
  normaliseAddress: () => normaliseAddress,
  normaliseNickname: () => normaliseNickname,
  phaseLabel: () => phaseLabel,
  playEntries: () => playEntries,
  playError: () => playError,
  pollPeriod: () => pollPeriod,
  prefsFrom: () => prefsFrom,
  relativeSeat: () => relativeSeat,
  roleLabel: () => roleLabel,
  seatName: () => seatName,
  selectionSummary: () => selectionSummary,
  shareText: () => shareText,
  statusLine: () => statusLine,
  suitSymbol: () => suitSymbol,
  toggleSelection: () => toggleSelection,
  turnGroups: () => turnGroups,
  waitingOnBot: () => waitingOnBot
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
function waitingOnBot(snapshot) {
  const seat = activeSeat(snapshot);
  if (seat === null || seat === void 0) return false;
  const entry = Array.isArray(snapshot?.seats) ? snapshot.seats[seat] : null;
  if (!entry) return false;
  return Boolean(entry.bot ?? entry.isBot);
}
function pollPeriod(snapshot, { collapsed = false, active = 900, quiet = 2600, bot = 260 } = {}) {
  if (waitingOnBot(snapshot)) return bot;
  return collapsed ? quiet : active;
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
function normaliseNickname(text) {
  const cleaned = String(text ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return [...cleaned].slice(0, MAX_NICK).join("");
}
function nicknameNote(raw, { taken = [], seat = 0 } = {}) {
  const name = normaliseNickname(raw);
  if (!name) return `\u7559\u7A7A\u5C31\u53EB\u300C\u73A9\u5BB6${seat + 1}\u300D`;
  if (taken.includes(name)) return `\u5DF2\u6709\u540C\u540D\uFF0C\u5165\u5EA7\u540E\u4F1A\u81EA\u52A8\u52A0\u5E8F\u53F7\u533A\u5206`;
  return `\u53E6\u5916\u4E24\u5BB6\u4F1A\u770B\u5230\u300C${name}\u300D`;
}
function hintMoves(snapshot, { limit = 8 } = {}) {
  const hand = Array.isArray(snapshot?.you?.hand) ? snapshot.you.hand : [];
  if (!hand.length) return [];
  const target = snapshot?.lastPlay && snapshot.lastPlay.move ? snapshot.lastPlay.move : null;
  const moves = target ? enumerateBeats(hand, target) : enumerateMoves(hand);
  const seen = /* @__PURE__ */ new Set();
  const ranked = [];
  for (const entry of moves) {
    const key = moveKey(entry.move);
    if (seen.has(key)) continue;
    seen.add(key);
    const cards = sortCardIds(entry.cardIds ?? []);
    const type = entry.move?.type ?? "";
    ranked.push({
      key,
      cards,
      move: entry.move,
      finishes: cards.length === hand.length,
      bomb: type === "bomb" || type === "rocket",
      value: Number(entry.move?.mainValue ?? 0)
    });
  }
  ranked.sort(function(left, right) {
    if (left.finishes !== right.finishes) return left.finishes ? -1 : 1;
    if (left.bomb !== right.bomb) return left.bomb ? 1 : -1;
    if (left.value !== right.value) return left.value - right.value;
    return right.cards.length - left.cards.length;
  });
  return ranked.slice(0, Math.max(1, limit)).map(function(entry, index) {
    return {
      id: `hint-${index}`,
      cards: entry.cards,
      label: entry.move?.label ?? "",
      note: entry.finishes ? "\u4E00\u628A\u8D70\u5B8C" : entry.bomb ? "\u52A8\u70B8\u5F39" : "",
      finishing: entry.finishes
    };
  });
}
function turnGroups(snapshot) {
  const seats = Array.isArray(snapshot?.seats) ? snapshot.seats : [];
  function nameOf(seat) {
    return seats[seat]?.name ?? `\u5EA7\u4F4D${Number(seat) + 1}`;
  }
  const turns = Array.isArray(snapshot?.turns) ? snapshot.turns : Array.isArray(snapshot?.plays) ? snapshot.plays.map((play) => ({ seat: play.seat, kind: "play", cards: play.cards, move: play.move })) : [];
  const groups = [];
  let passes = 0;
  for (const turn of turns) {
    const kind = turn?.kind === "pass" ? "pass" : "play";
    if (!groups.length || passes >= 2) {
      passes = 0;
      groups.push({ index: groups.length + 1, lead: turn.seat, items: [] });
    }
    const group = groups[groups.length - 1];
    const cards = Array.isArray(turn.cards) ? turn.cards : [];
    const label = kind === "pass" ? "\u4E0D\u51FA" : turn.move?.label ?? "";
    group.items.push({
      key: `t${groups.length}-${group.items.length}`,
      seat: turn.seat,
      name: nameOf(turn.seat),
      kind,
      cards,
      label,
      text: kind === "pass" ? "\u4E0D\u51FA" : cards.map(cardText).join(" "),
      lead: group.items.length === 0
    });
    passes = kind === "pass" ? passes + 1 : 0;
  }
  return groups;
}
function historySummary(snapshot) {
  const groups = turnGroups(snapshot);
  const turns = groups.reduce((total, group) => total + group.items.length, 0);
  if (!turns) return "\u672C\u5C40\u8FD8\u6CA1\u6709\u4EBA\u51FA\u724C";
  return `\u672C\u5C40 ${groups.length} \u8F6E \xB7 ${turns} \u624B`;
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
  const address = typeof value.lastAddress === "string" ? value.lastAddress.trim().slice(0, 64) : "";
  const code = typeof value.lastCode === "string" ? value.lastCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) : "";
  return {
    x,
    y,
    collapsed: value.collapsed === true,
    // Only the table pane is shipped so far; anything else falls back to it.
    pane: value.pane === "log" ? "log" : "table",
    name: [...name].slice(0, MAX_NICK).join(""),
    botLevel: isBotLevel(value.botLevel) ? String(value.botLevel) : DEFAULT_BOT_LEVEL,
    lastAddress: address,
    lastCode: code,
    // The play history is folded away by default: the table is the point, and a
    // long record would push the cards below the fold of the floating window.
    historyOpen: value.historyOpen === true
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
var PREFS_KEY, MINI_W, MINI_H, EDGE, SUIT_ORDER, PHASE_TEXT, MAX_NICK, ROUTE_BODIES, BOT_LEVELS, BOT_LABELS, DEFAULT_BOT_LEVEL, BOT_BLURBS;
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
    MAX_NICK = 12;
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
      hard: '\u5148\u624B\u6309"\u8FD8\u5269\u51E0\u624B"\u9009\u724C\uFF0C\u8DDF\u724C\u4E0D\u62C6\u81EA\u5DF1\u7684\u5BF9\u5B50\uFF0C2 \u548C\u738B\u7559\u7740\u5F53\u63A7\u5236\u724C\uFF1B\u53EB\u5206\u6BD4\u4E2D\u7B49\u66F4\u51F6\u3002',
      hell: '\u5728\u56F0\u96BE\u4E4B\u4E0A\u8FD8\u4F1A\u8BB0\u8D26\uFF1A\u8C01\u5FEB\u8D70\u5B8C\u65F6\u5148\u7B97"\u6211\u8FD9\u4E00\u624B\u538B\u4E0D\u538B\u5F97\u4F4F"\uFF0C\u538B\u4E0D\u4F4F\u5C31\u4E0A\u70B8\u5F39\uFF0C\u8FD8\u80FD\u7B97\u51FA\u4E00\u8DEF\u538B\u7740\u8D70\u5B8C\u7684\u5FC5\u6740\u8DEF\u7EBF\uFF1B\u53EB\u5206\u95E8\u69DB\u6700\u4F4E\uFF0C\u624B\u724C\u7A0D\u597D\u5C31\u6562\u62A2\u5730\u4E3B\u3002'
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
var POLL_MS_BOT = 260;
var PILL_W = 148;
var DRAG_SLOP = 4;
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
function initial(name) {
  const chars = [...String(name ?? "").trim()];
  return chars.length ? chars[0] : "?";
}
function SeatCard(props) {
  const info = (props.snapshot.seats || [])[props.seat];
  if (!info) return null;
  const you = props.seat === props.youSeat;
  const active = UI.activeSeat(props.snapshot) === props.seat;
  const role = UI.roleLabel(info.role);
  const count = info.hand ? info.hand.length : info.count;
  const dealt = props.snapshot.phase !== "lobby";
  const ratio = Math.max(0, Math.min(1, count / 20));
  const order = you ? "\u6211" : UI.relativeSeat(props.seat, props.youSeat) === "right" ? "\u4E0B" : "\u4E0A";
  const className = "ddz-seat-card" + (active ? " active" : "") + (you ? " me" : "") + (info.bot ? " bot" : "");
  const title = [
    you ? "\u4F60" : info.name,
    order === "\u4E0B" ? "\u4F60\u7684\u4E0B\u5BB6" : order === "\u4E0A" ? "\u4F60\u7684\u4E0A\u5BB6" : "",
    info.bot ? UI.BOT_BLURBS[info.bot] || "\u7535\u8111" : "",
    info.occupied && !info.connected ? "\u6389\u7EBF" : ""
  ].filter(Boolean).join(" \xB7 ");
  return h(
    "div",
    { className, title },
    h(
      "div",
      { className: "ddz-seat-top" },
      h("span", { className: "ddz-ava" }, info.bot ? "\u{1F916}" : initial(info.name)),
      h("span", { className: "ddz-seat-name" }, info.name),
      h("span", { className: "ddz-seat-order" }, order)
    ),
    h(
      "div",
      { className: "ddz-seat-line" },
      role ? h("span", { className: "ddz-badge " + info.role }, role) : null,
      !info.occupied ? h("span", { className: "ddz-badge" }, "\u7A7A\u4F4D") : null,
      !info.occupied ? null : dealt ? h("span", { className: "ddz-seat-count" }, h("b", {}, String(count)), " \u5F20") : h("span", { className: "ddz-seat-count ddz-seat-idle" }, "\u672A\u53D1\u724C"),
      info.bid ? h("span", { className: "ddz-seat-note" }, "\u53EB " + info.bid) : null
    ),
    dealt ? h(
      "span",
      { className: "ddz-meter" },
      h("span", {
        className: "ddz-meter-fill" + (count <= 5 ? " low" : ""),
        style: { width: Math.round(ratio * 100) + "%" }
      })
    ) : null
  );
}
function SeatList(props) {
  const s = props.snapshot;
  const you = s.you ? s.you.seat : 0;
  const order = [you, (you + 1) % 3, (you + 2) % 3];
  return h("div", { className: "ddz-seats" }, order.map(function(seat) {
    return h(SeatCard, { key: seat, seat, snapshot: s, youSeat: you });
  }));
}
function Felt(props) {
  const s = props.snapshot;
  const last = s.lastPlay;
  const seats = s.seats || [];
  const youSeat = s.you ? s.you.seat : -1;
  const who = last ? seats[last.seat]?.name ?? "" : "";
  if (s.phase === "lobby") {
    return h(
      "div",
      { className: "ddz-felt empty" },
      h("span", { className: "ddz-empty" }, "\u4E09\u5BB6\u5750\u6EE1\u5C31\u5F00\u5C40")
    );
  }
  const label = last ? last.seat === youSeat ? "\u4F60\u51FA\u7684" : who + " \u51FA\u7684" : s.phase === "finished" ? "\u672C\u5C40\u7ED3\u675F" : "\u53F0\u9762\u7A7A\u7740";
  return h(
    "div",
    { className: "ddz-felt" },
    h(
      "div",
      { className: "ddz-felt-head" },
      h("span", { className: "ddz-felt-label" }, label),
      last && last.move ? h("span", { className: "ddz-badge" }, last.move.label) : null,
      s.passes ? h("span", { className: "ddz-felt-pass" }, s.passes + " \u5BB6\u4E0D\u51FA") : null,
      h("span", { className: "ddz-grow" }),
      // The bottom cards as text: they are context, not something to beat, and
      // three more card faces would make the felt the tallest block on screen.
      s.bottomRevealed && Array.isArray(s.bottom) && s.bottom.length ? h("span", { className: "ddz-felt-bottom", title: "\u5730\u4E3B\u6361\u5230\u7684\u4E09\u5F20\u5E95\u724C" }, "\u5E95\u724C " + s.bottom.map(UI.cardText).join(" ")) : null
    ),
    h(
      "div",
      { className: "ddz-felt-cards" },
      last ? (last.cards || []).map(function(id) {
        return h(Card, { key: id, id, mini: true });
      }) : h("span", { className: "ddz-empty" }, s.phase === "lobby" ? "\u7B49\u4E09\u5BB6\u5750\u6EE1" : "\u7B49\u8FD9\u4E00\u624B")
    )
  );
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
    const hints = props.hints || [];
    const at = props.hintAt || 0;
    const hint = hints.length ? hints[at % hints.length] : null;
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
      h("button", {
        type: "button",
        className: "ddz-btn sm hint",
        disabled: busy || !hints.length,
        title: hints.length ? "\u4ECE\u6700\u7701\u724C\u529B\u7684\u4E00\u624B\u5F00\u59CB\u9009\u4E2D\uFF0C\u518D\u70B9\u6362\u4E0B\u4E00\u4E2A\u5EFA\u8BAE" : "\u8FD9\u624B\u724C\u538B\u4E0D\u8FC7\u53F0\u9762\uFF0C\u53EA\u80FD\u4E0D\u51FA",
        onClick: function() {
          if (props.onHint) props.onHint(hints);
        }
      }, hint && hints.length > 1 ? "\u63D0\u793A " + (at % hints.length + 1) + "/" + hints.length : "\u63D0\u793A"),
      h("button", {
        type: "button",
        className: "ddz-btn sm hint-play",
        disabled: busy || !hint,
        title: hint ? "\u76F4\u63A5\u6253\u8FD9\u4E00\u624B\uFF1A" + hint.cards.map(UI.cardText).join(" ") : "\u6CA1\u6709\u53EF\u51FA\u7684\u724C",
        onClick: function() {
          if (props.onHintPlay) props.onHintPlay(hint);
        }
      }, "\u5E2E\u6211\u51FA")
    ));
    const picked = Array.isArray(props.selection) ? props.selection.length : 0;
    const warn2 = picked ? error : "";
    const advice = warn2 ? "" : picked ? UI.selectionSummary(props.selection) : hint ? "\u5EFA\u8BAE " + hint.label + " \xB7 " + hint.cards.map(UI.cardText).join(" ") + (hint.note ? "\uFF08" + hint.note + "\uFF09" : "") : c.playEnabled ? "\u6CA1\u6709\u80FD\u538B\u8FC7\u53F0\u9762\u7684\u724C\uFF0C\u53EA\u80FD\u4E0D\u51FA" : "";
    if (warn2) rows.push(h("div", { key: "warn", className: "ddz-advice ddz-warn" }, warn2));
    if (advice) rows.push(h("div", { key: "advice", className: "ddz-advice" }, advice));
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
  const wide = !props.compact;
  const where = chips.map(function(chip) {
    return String(chip.url).replace(/^https?:\/\//, "");
  });
  const loopback = String(authority.loopbackUrl || "").replace(/^https?:\/\//, "");
  const hiddenNote = hidden.length ? "\u5DF2\u8FC7\u6EE4 " + hidden.length + " \u4E2A\u865A\u62DF\u7F51\u5361\u5730\u5740\uFF08" + hidden.map(function(entry) {
    return entry.iface;
  }).join("\u3001") + "\uFF09\u2014\u2014 \u90A3\u662F WSL / \u865A\u62DF\u673A / VPN \u7684\u7F51\u5361\uFF0C\u522B\u7684\u7535\u8111\u8FDE\u4E0D\u4E0A\u3002" : "";
  return h(
    "div",
    { className: "ddz-share-block" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u623F\u95F4\u7801"),
      h("span", { className: "ddz-code" }, authority.code),
      h("button", {
        type: "button",
        className: "ddz-btn sm ghost",
        title: "\u590D\u5236\u300C" + text + "\u300D",
        onClick: function() {
          copy(text);
        }
      }, "\u590D\u5236\u9080\u8BF7"),
      h("span", { className: "ddz-grow" }),
      hidden.length ? h("span", { className: "ddz-note", title: hiddenNote }, "\u5DF2\u8FC7\u6EE4 " + hidden.length + " \u4E2A\u865A\u62DF\u7F51\u5361") : null
    ),
    h(
      "div",
      { className: "ddz-row ddz-where" },
      h("span", { className: "ddz-label" }, "\u5730\u5740"),
      where.length ? h("code", {
        className: "ddz-url",
        title: "\u70B9\u51FB\u590D\u5236\u8FD9\u4E2A\u5730\u5740",
        onClick: function() {
          copy(where[0]);
        }
      }, where[0]) : h("span", { className: "ddz-note" }, "\u8FD8\u6CA1\u6709\u5C40\u57DF\u7F51\u5730\u5740"),
      where.length > 1 ? h("span", { className: "ddz-note", title: where.slice(1).join("\u3001") }, "+" + (where.length - 1)) : null,
      // Handing 127.0.0.1 to someone else points at *their* machine, so the
      // loopback address is only ever shown in the roomy tab, and labelled.
      wide && loopback ? h("code", {
        className: "ddz-url",
        title: "\u672C\u673A\u56DE\u73AF\u5730\u5740\uFF0C\u53EA\u6709\u8FD9\u53F0\u7535\u8111\u80FD\u7528",
        onClick: function() {
          copy(loopback);
        }
      }, loopback + "\uFF08\u672C\u673A\uFF09") : null
    ),
    wide ? h("div", { className: "ddz-note" }, "\u53E6\u5916\u4E24\u5BB6\u5728\u81EA\u5DF1\u6D6E\u7A97\u91CC\u586B\u8FD9\u4E2A\u5730\u5740\u548C\u623F\u95F4\u7801\uFF1B\u5730\u5740\u70B9\u4E00\u4E0B\u5C31\u590D\u5236\u3002") : null
  );
}
function BotPanel(props) {
  const s = props.snapshot;
  if (!s || !s.isHost) return null;
  const seated = Number(s.botsSeated || 0);
  const capacity = UI.botCapacity(s);
  const level = UI.isBotLevel(s.botLevel) ? s.botLevel : UI.DEFAULT_BOT_LEVEL;
  const countLocked = Boolean(props.busy) || !s.canSetBotCount;
  const wide = !props.compact;
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
      }, capacity === 0 ? "\u5DF2\u6EE1\u5458" : seated > 0 ? "\u8865\u9F50" : "\u7528\u7535\u8111\u8865\u9F50"),
      seated > 0 ? h("button", {
        type: "button",
        className: "ddz-btn sm ghost",
        disabled: countLocked,
        title: s.canSetBotCount ? "\u628A\u7535\u8111\u64A4\u4E0B\uFF0C\u7A7A\u4F4D\u7559\u7ED9\u670B\u53CB" : "\u724C\u5C40\u8FDB\u884C\u4E2D\uFF0C\u7B49\u8FD9\u5C40\u7ED3\u675F",
        onClick: function() {
          setCount(0);
        }
      }, "\u64A4\u4E0B") : null,
      h("span", { className: "ddz-grow" }),
      h(
        "span",
        { className: "ddz-note", title: UI.BOT_BLURBS[level] },
        seated > 0 ? "\u5728\u573A " + seated + " \u4E2A" : "\u4E00\u4E2A\u90FD\u6CA1\u4E0A"
      )
    ),
    wide ? h("div", { className: "ddz-note" }, UI.BOT_BLURBS[level]) : null
  );
}
function RoomStrip(props) {
  const s = props.snapshot;
  const wide = !props.compact;
  const inHand = Boolean(s) && s.phase !== "lobby";
  const [override, setOverride] = React.useState(null);
  const open = override === null ? wide || !inHand : override;
  const first = props.state.authority ? UI.lanChips(props.state.authority)[0] : null;
  if (!props.state.authority && !(s && s.isHost)) return null;
  return h(
    "div",
    { className: "ddz-room" + (open ? " open" : "") },
    h(
      "button",
      {
        type: "button",
        className: "ddz-room-head",
        "aria-expanded": open ? "true" : "false",
        onClick: function() {
          setOverride(!open);
        }
      },
      h("span", { className: "ddz-chev" }, open ? "\u25BE" : "\u25B8"),
      h("span", { className: "ddz-room-title" }, "\u623F\u95F4"),
      props.state.authority ? h("span", { className: "ddz-room-code" }, props.state.authority.code) : null,
      first ? h("span", { className: "ddz-room-addr" }, String(first.url).replace(/^https?:\/\//, "")) : null,
      h("span", { className: "ddz-grow" }),
      h("span", { className: "ddz-note" }, s && s.isHost ? "\u4F60\u662F\u623F\u4E3B" : "\u5BA2\u673A")
    ),
    open ? h(
      "div",
      { className: "ddz-room-body" },
      h(ShareBlock, { state: props.state, compact: props.compact }),
      s && s.isHost ? h(BotPanel, { snapshot: s, busy: props.busy, compact: props.compact }) : null
    ) : null
  );
}
function Lobby(props) {
  const state = props.state;
  const [mode, setMode] = React.useState("host");
  const [name, setName] = React.useState(props.prefs.name || state.playerName || "");
  const [port, setPort] = React.useState(String(state.defaults && state.defaults.port || 8791));
  const [address, setAddress] = React.useState(props.prefs.lastAddress || "");
  const [code, setCode] = React.useState(props.prefs.lastCode || "");
  const [note, setNote] = React.useState("");
  const [local, setLocal] = React.useState("");
  function remember(next) {
    props.setPrefs({ name: UI.normaliseNickname(next) });
  }
  function onHost() {
    props.setPrefs({ name: UI.normaliseNickname(name) });
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
    const roomCode = String(code).trim().toUpperCase();
    if (!/^[A-Za-z0-9]{4,8}$/.test(roomCode)) {
      setLocal("\u623F\u95F4\u7801\u662F 6 \u4F4D\u5B57\u6BCD\u6570\u5B57");
      return;
    }
    props.setPrefs({
      name: UI.normaliseNickname(name),
      lastAddress: String(address).trim().slice(0, 64),
      lastCode: roomCode
    });
    setLocal("");
    post("join", { url: base, code: roomCode, name: String(name || "").trim() });
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
    { className: "ddz-col" },
    h(
      "div",
      { className: "ddz-row" },
      h("span", { className: "ddz-label" }, "\u6635\u79F0"),
      h("input", {
        className: "ddz-input ddz-grow",
        value: name,
        maxLength: UI.MAX_NICK,
        placeholder: "\u7559\u7A7A\u4E5F\u884C",
        onChange: function(event) {
          setName(UI.normaliseNickname(event.target.value));
        },
        onBlur: function() {
          remember(name);
        }
      }),
      h("span", { className: "ddz-note ddz-count-note" }, [...name].length + "/" + UI.MAX_NICK)
    ),
    h("div", { className: "ddz-note" }, UI.nicknameNote(name, { seat: state.role === "guest" && state.guest ? state.guest.seat : 0 }))
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
function TurnDock(props) {
  const s = props.snapshot;
  const controls = UI.controlsFor(s);
  const me = s ? s.you : null;
  const hints = s && controls.playEnabled ? UI.hintMoves(s) : [];
  const [hintAt, setHintAt] = React.useState(0);
  const turnKey = s ? s.handNo + ":" + s.seq : "none";
  React.useEffect(function() {
    setHintAt(0);
  }, [turnKey]);
  if (!s || !me) return null;
  function onHint(list) {
    if (!list || !list.length) return;
    const next = list[hintAt % list.length];
    props.setSelection(next.cards.slice());
    setHintAt((hintAt + 1) % list.length);
  }
  function onHintPlay(hint) {
    if (!hint) return;
    props.setSelection(hint.cards.slice());
    act({ type: "play", cards: hint.cards.slice() });
  }
  return h(
    "div",
    { className: "ddz-dock" + (props.fixed ? " fixed" : "") },
    h(ActionRow, {
      snapshot: s,
      controls,
      selection: props.selection,
      busy: props.busy,
      hints,
      hintAt,
      onHint,
      onHintPlay
    }),
    h(Hand, {
      ids: me.hand,
      selection: props.selection,
      mini: props.mini,
      empty: "\u624B\u724C\u8FD8\u6CA1\u53D1",
      onToggle: controls.playEnabled ? function(id) {
        props.setSelection(UI.toggleSelection(props.selection, id));
      } : void 0
    })
  );
}
function TrickRows(props) {
  return h(
    "div",
    { className: "ddz-trick" + (props.latest ? " latest" : "") },
    h(
      "div",
      { className: "ddz-trick-head" },
      h("span", { className: "ddz-trick-no" }, "\u7B2C " + props.group.index + " \u8F6E"),
      h("span", { className: "ddz-grow" }),
      props.group.items[0] ? h("span", { className: "ddz-note" }, props.group.items[0].name + " \u9886\u51FA") : null
    ),
    props.group.items.map(function(item) {
      return h(
        "div",
        { key: item.key, className: "ddz-turn" + (item.kind === "pass" ? " pass" : "") },
        h("span", { className: "ddz-turn-who" }, item.name),
        h("span", { className: "ddz-turn-what" }, item.kind === "pass" ? "\u4E0D\u51FA" : item.text),
        item.kind === "pass" ? null : h("span", { className: "ddz-turn-shape" }, item.label)
      );
    })
  );
}
function HistoryBlock(props) {
  const s = props.snapshot;
  const groups = UI.turnGroups(s);
  const open = Boolean(props.open);
  const listRef = React.useRef(null);
  React.useEffect(function() {
    const node = listRef.current;
    if (!open || !node) return;
    const tricks = node.querySelectorAll(".ddz-trick");
    if (!tricks.length) {
      node.scrollTop = 0;
      return;
    }
    const last = tricks[tricks.length - 1];
    const overflows = last.offsetTop + last.offsetHeight > node.clientHeight;
    node.scrollTop = overflows && tricks.length > 1 ? tricks[tricks.length - 2].offsetTop - 4 : Math.max(0, node.scrollHeight - node.clientHeight);
  }, [open, groups.length, s ? s.seq : 0]);
  return h(
    "div",
    { className: "ddz-history" + (open ? " open" : "") },
    h(
      "button",
      {
        type: "button",
        className: "ddz-history-head",
        "aria-expanded": open ? "true" : "false",
        onClick: function() {
          if (props.onToggle) props.onToggle();
        }
      },
      h("span", { className: "ddz-chev" }, open ? "\u25BE" : "\u25B8"),
      h("span", { className: "ddz-history-title" }, "\u51FA\u724C\u5386\u53F2"),
      h("span", { className: "ddz-note" }, UI.historySummary(s))
    ),
    open ? h("div", { className: "ddz-history-body", ref: listRef }, groups.map(function(group, index) {
      return h(TrickRows, { key: "g" + group.index, group, latest: index === groups.length - 1 });
    })) : null
  );
}
function StatusPanel(props) {
  const state = props.state;
  const s = state.snapshot;
  const controls = UI.controlsFor(s);
  const status = s ? UI.statusLine(s, controls) : "";
  const me = s ? s.you : null;
  const [renaming, setRenaming] = React.useState(null);
  function submitRename() {
    const name = UI.normaliseNickname(renaming);
    setRenaming(null);
    act({ type: "rename", name });
  }
  const identity = h(
    "div",
    { className: "ddz-row" },
    h("span", { className: "ddz-badge" }, state.role === "host" ? "\u623F\u4E3B" : "\u5BA2\u4EBA"),
    me ? h("span", { className: "ddz-badge " + (me.role || "") }, UI.roleLabel(me.role) || "\u672A\u5B9A") : null,
    s && s.handNo > 0 ? h("span", { className: "ddz-note" }, "\u7B2C " + s.handNo + " \u5C40") : null,
    h("span", { className: "ddz-grow" }),
    me ? h("button", {
      type: "button",
      className: "ddz-btn sm ghost",
      disabled: props.busy,
      title: "\u6539\u4E00\u4E2A\u53E6\u5916\u4E24\u5BB6\u770B\u5F97\u89C1\u7684\u540D\u5B57",
      onClick: function() {
        setRenaming(me.name);
      }
    }, "\u6539\u540D") : null,
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
  const renameRow = renaming === null ? null : h(
    "div",
    { className: "ddz-row ddz-rename" },
    h("span", { className: "ddz-label" }, "\u6635\u79F0"),
    h("input", {
      className: "ddz-input ddz-grow",
      value: renaming,
      maxLength: UI.MAX_NICK,
      placeholder: "\u53E6\u5916\u4E24\u5BB6\u4F1A\u770B\u5230",
      autoFocus: true,
      onChange: function(event) {
        setRenaming(UI.normaliseNickname(event.target.value));
      },
      onKeyDown: function(event) {
        if (event.key === "Enter") submitRename();
        if (event.key === "Escape") setRenaming(null);
      }
    }),
    h("button", { type: "button", className: "ddz-btn sm primary", disabled: props.busy, onClick: submitRename }, "\u4FDD\u5B58"),
    h("button", { type: "button", className: "ddz-btn sm ghost", onClick: function() {
      setRenaming(null);
    } }, "\u53D6\u6D88")
  );
  return h(
    "div",
    { className: "ddz-col" },
    identity,
    renameRow,
    status ? h("div", { className: "ddz-status" }, status) : null,
    h(RoomStrip, { state, snapshot: s, busy: props.busy, compact: Boolean(props.mini) }),
    state.role === "guest" && state.guest ? h("div", { className: "ddz-note" }, "\u5DF2\u8FDE\u4E0A " + String(state.guest.baseUrl).replace(/^https?:\/\//, "") + "\uFF0C" + (state.guest.seat + 1) + " \u53F7\u4F4D") : null,
    s ? h(SeatList, { snapshot: s }) : null,
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
    s ? h(HistoryBlock, {
      snapshot: s,
      open: props.prefs ? props.prefs.historyOpen : false,
      onToggle: props.setPrefs ? function() {
        props.setPrefs({ historyOpen: !(props.prefs && props.prefs.historyOpen) });
      } : null
    }) : null,
    props.dock ? null : h(
      "div",
      { className: "ddz-col" },
      h("div", { className: "ddz-divider" }),
      h(TurnDock, {
        snapshot: s,
        selection: props.selection,
        setSelection: props.setSelection,
        busy: props.busy,
        mini: props.mini
      })
    )
  );
}
function HistoryPanel(props) {
  const s = props.snapshot;
  if (!s) return h("div", { className: "ddz-empty" }, "\u8FD8\u6CA1\u6709\u8BB0\u5F55");
  const groups = UI.turnGroups(s);
  const events = UI.logEntries(s);
  return h(
    "div",
    { className: "ddz-col" },
    h("div", { className: "ddz-label" }, "\u51FA\u724C\u5386\u53F2"),
    groups.length ? h("div", { className: "ddz-history-body static" }, groups.map(function(group, index) {
      return h(TrickRows, { key: "g" + group.index, group, latest: index === groups.length - 1 });
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
    mini: props.mini,
    prefs: props.prefs,
    setPrefs: props.setPrefs,
    dock: props.dock
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
  const movedRef = React.useRef(false);
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
    setPeriod(UI.pollPeriod(snapshot, {
      collapsed,
      active: POLL_MS,
      quiet: POLL_MS_QUIET,
      bot: POLL_MS_BOT
    }));
  }, [collapsed, snapshot]);
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
    movedRef.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
    }
    setDrag({ x: event.clientX, y: event.clientY, left: box2.left, top: box2.top });
  }
  function onPointerMove(event) {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!movedRef.current) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
      movedRef.current = true;
    }
    setLive(UI.clampPosition(drag.left + dx, drag.top + dy, viewport(), size));
  }
  function onPointerUp() {
    if (!drag) return;
    setDrag(null);
    if (live) {
      setPrefs({ x: live.x, y: live.y });
      setLive(null);
    }
  }
  function swallowDragClick() {
    if (!movedRef.current) return false;
    movedRef.current = false;
    return true;
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
        title: "\u5355\u51FB\u5C55\u5F00 \xB7 \u62D6\u52A8\u79FB\u52A8",
        onClick: function(event) {
          if (swallowDragClick()) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          setPrefs({ collapsed: false });
        },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp
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
        mini: true,
        dock: true
      })
    ),
    // The hand is docked, not scrolled: a 20-card landlord hand makes the table
    // taller than the window, and the cards you play with must never be the part
    // that scrolls away. In the lobby there are no cards to dock yet.
    prefs.pane === "table" && snapshot && snapshot.you && snapshot.phase !== "lobby" ? h("div", { className: "ddz-dock-bar" }, h(TurnDock, {
      snapshot,
      selection: selectionState,
      setSelection: setSelectionAndStore,
      busy: view.busy,
      mini: true,
      fixed: true
    })) : null,
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
