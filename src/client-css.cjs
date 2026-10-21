// Styles for both the floating window and the conversation tab.
//
// Colours come from the host's theme tokens with a fallback each, so the plugin
// follows a light/dark switch instead of hardcoding one look. Anything painted on
// a brand fill takes its text colour from --dsw-alias-label-primary-foreground:
// the dark theme's brand colour is a near-white accent (#f9fafb), so a literal
// white label on it disappears (fixed in 0.1.4, guarded by test/theme.test.mjs).
//
// Movement is deliberately small — a hover lift, a selected card, a dot that
// blinks when it is your turn — and all of it is switched off under
// prefers-reduced-motion.
module.exports = `
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
   the detail opens in place — switching to a 记录 tab used to lose the table. */
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
/* 提示/帮我出 are helpers, not a second primary action: they keep the plain
   secondary weight so the row has exactly one strong button (出牌). */
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
`
