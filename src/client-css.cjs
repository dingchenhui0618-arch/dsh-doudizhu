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
  background:var(--dsw-alias-bg-overlay,#1c1c22);color:var(--dsw-alias-label-primary,#eee);cursor:pointer;
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

.ddz-mini{position:fixed;z-index:60;display:flex;flex-direction:column;width:344px;max-height:78vh;
  background:var(--dsw-alias-bg-overlay,#1c1c22);color:var(--dsw-alias-label-primary,#eee);
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
.ddz-mini-body{padding:10px;overflow:auto;display:flex;flex-direction:column;gap:9px;flex:1}
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

.ddz-seat{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:9px;font-size:12px;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05));border:1px solid transparent;
  transition:background .15s ease,border-color .15s ease,box-shadow .15s ease}
.ddz-seat.active{border-color:var(--dsw-alias-state-success-primary,#3ecf72);
  box-shadow:0 0 0 1px var(--dsw-alias-state-success-primary,#3ecf72)}
.ddz-seat.me{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.09))}
.ddz-seat-name{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ddz-seat-count{margin-left:auto;color:var(--dsw-alias-label-secondary,#9aa);font-variant-numeric:tabular-nums}
.ddz-seats{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ddz-seats .ddz-seat.wide{grid-column:1 / -1}

.ddz-table{border-radius:11px;padding:8px;min-height:76px;display:flex;flex-direction:column;gap:6px;
  background:linear-gradient(180deg,var(--dsw-alias-bg-layer-1,rgba(255,255,255,.05)),transparent);
  border:1px dashed var(--dsw-alias-border-l2,rgba(255,255,255,.18))}
.ddz-play{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}
.ddz-play-who{color:var(--dsw-alias-label-secondary,#9aa);min-width:52px}
.ddz-empty{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa)}

.ddz-hand{display:flex;flex-wrap:wrap;gap:4px;padding:2px 0;min-height:52px}
.ddz-card{width:34px;height:48px;border-radius:7px;display:flex;flex-direction:column;align-items:center;
  justify-content:center;cursor:pointer;user-select:none;padding:0;font:inherit;
  background:linear-gradient(180deg,var(--dsw-alias-bg-layer-2,#26262e),var(--dsw-alias-bg-layer-1,#202027));
  color:var(--dsw-alias-label-primary,#eee);box-shadow:0 1px 2px rgba(0,0,0,.28);
  border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.22));
  transition:transform .1s ease,box-shadow .1s ease,border-color .1s ease}
.ddz-card:hover{transform:translateY(-4px);box-shadow:0 6px 14px rgba(0,0,0,.3)}
.ddz-card:active{transform:translateY(-2px) scale(.97)}
.ddz-card .ddz-rank{font-size:14px;font-weight:700;line-height:1}
.ddz-card .ddz-suit{font-size:12px;line-height:1}
.ddz-card.red{color:var(--dsw-alias-state-error-primary,#ff6b6b)}
.ddz-card.joker .ddz-rank{font-size:11px}
.ddz-card.joker.big{color:var(--dsw-alias-state-warn-primary,#ffcf5c)}
.ddz-card.sel{transform:translateY(-10px);border-color:var(--dsw-alias-brand-primary,#4a7dff);
  box-shadow:0 0 0 2px var(--dsw-alias-brand-primary,#4a7dff),0 8px 18px rgba(0,0,0,.32)}
.ddz-card.mini{width:26px;height:36px}
.ddz-card.mini .ddz-rank{font-size:11px}
.ddz-card.mini .ddz-suit{font-size:9px}

.ddz-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;letter-spacing:.14em;font-weight:700}
.ddz-urls{display:flex;flex-direction:column;gap:3px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.ddz-urls code{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));padding:2px 6px;border-radius:5px;
  cursor:pointer;word-break:break-all;transition:background .15s ease}
.ddz-urls code:hover{background:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.1))}
.ddz-share{font-size:12px;padding:7px 9px;border-radius:8px;word-break:break-all;
  background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.06));border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.12))}
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
.ddz-chips button:focus-visible,.ddz-card:focus-visible,.ddz-urls code:focus-visible{outline:2px solid var(--dsw-alias-label-primary,#eee);outline-offset:2px}

/* Thin, theme-coloured scrollbars in the two scrolling panes. */
.ddz-mini-body,.ddz-view{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2,rgba(255,255,255,.22)) transparent}
.ddz-mini-body::-webkit-scrollbar,.ddz-view::-webkit-scrollbar{width:8px;height:8px}
.ddz-mini-body::-webkit-scrollbar-thumb,.ddz-view::-webkit-scrollbar-thumb{
  background:var(--dsw-alias-border-l2,rgba(255,255,255,.22));border-radius:8px;border:2px solid transparent;background-clip:padding-box}
.ddz-mini-body::-webkit-scrollbar-track,.ddz-view::-webkit-scrollbar-track{background:transparent}

@media (prefers-reduced-motion: reduce){
  .ddz-pill,.ddz-btn,.ddz-ico-btn,.ddz-card,.ddz-seat,.ddz-tabs button,.ddz-chips button,.ddz-input,.ddz-select{transition:none}
  .ddz-pill.turn .ddz-dot{animation:none}
  .ddz-pill:hover,.ddz-card:hover,.ddz-card.sel,.ddz-card:active,.ddz-btn:active:not(:disabled){transform:none}
}
`
