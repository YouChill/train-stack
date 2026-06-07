const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.tp{font-family:'DM Sans',sans-serif;background:#eef1f6;min-height:100vh;color:#1f2937;display:flex;flex-direction:column;overflow:hidden;}

/* ── HEADER ── */
.tp-hdr{height:56px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#1a2233;border-bottom:1px solid #2a3348;flex-shrink:0;z-index:50;}
.tp-logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;letter-spacing:0.5px;color:#b4f13a;white-space:nowrap;}
.tp-logo em{color:#5b6478;font-style:normal;}
.tp-div{width:1px;height:22px;background:#2a3348;flex-shrink:0;}
.tp-wnav{display:flex;align-items:center;gap:6px;}
.tp-wrange{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:#9ca3af;min-width:134px;text-align:center;letter-spacing:0.3px;}
.tp-prog{display:flex;align-items:center;gap:7px;}
.tp-prog-bar{width:66px;height:3px;background:#2a3348;border-radius:2px;overflow:hidden;}
.tp-prog-fill{height:100%;background:#b4f13a;transition:width .4s;}
.tp-prog-txt{font-size:10px;font-weight:600;color:#6b7280;}
.tp-spacer{flex:1;}
.tp-hbtn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #2a3348;background:#1e293b;color:#7b849a;transition:all .15s;white-space:nowrap;font-family:'DM Sans',sans-serif;}
.tp-hbtn:hover{background:#2a3348;color:#d1d5db;}
.tp-hbtn-ic{background:#1e293b;border:1px solid #2a3348;color:#5b6478;padding:5px;border-radius:7px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.tp-hbtn-ic:hover{background:#2a3348;color:#d1d5db;}
.tp-btn-lime{background:#b4f13a;border-color:transparent;color:#111827;font-weight:700;}
.tp-btn-lime:hover{background:#c8ff50;color:#111827;}
.tp-btn-ai{background:linear-gradient(135deg,#5b5bd4,#7c50c8);border-color:transparent;color:#fff;font-weight:700;}
.tp-btn-ai:hover{background:linear-gradient(135deg,#6c6ce4,#8d60d8);border-color:transparent;}

/* ── VIEW SWITCHER ── */
.tp-view-sw{display:inline-flex;background:#111827;border:1px solid #2a3348;border-radius:8px;padding:2px;gap:2px;}
.tp-view-sw button{background:transparent;border:none;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:4px 11px;border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;display:inline-flex;align-items:center;gap:4px;}
.tp-view-sw button:hover{color:#d1d5db;}
.tp-view-sw button.active{background:#b4f13a;color:#111827;}

/* ── BOARD ── */
.tp-board{display:grid;grid-template-columns:repeat(7,1fr);flex:1;gap:1px;background:#dde2ec;overflow:hidden;height:calc(100vh - 56px);}

/* ── DAY COLUMN ── */
.tp-col{background:#f4f6fb;display:flex;flex-direction:column;overflow:hidden;}
.tp-col-hd{padding:10px 10px 8px;border-bottom:2px solid transparent;flex-shrink:0;transition:border-color .2s;}
.tp-col-hd.today{border-bottom-color:#a3e02e;}
.tp-col-hd-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;}
.tp-day-s{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a0b4;}
.tp-day-s.today{color:#65a30d;}
.tp-add-day{background:none;border:none;cursor:pointer;color:#b4bccc;padding:2px;border-radius:4px;transition:all .15s;display:flex;}
.tp-add-day:hover{color:#65a30d;background:#b4f13a25;}
.tp-day-n{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;line-height:1;color:#a8b4c8;}
.tp-day-n.today{color:#65a30d;}
.tp-col-body{flex:1;overflow-y:auto;padding:7px;display:flex;flex-direction:column;gap:5px;}

::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#2a3348;border-radius:2px;}

/* ── CARD ── */
.tp-card{background:#fff;border:1px solid #d4dbe8;border-radius:9px;padding:10px 11px 8px;cursor:pointer;transition:border-color .15s,box-shadow .15s;position:relative;box-shadow:0 1px 3px rgba(20,30,55,.06);}
.tp-card:hover{border-color:#b8c4d8;box-shadow:0 4px 12px rgba(20,30,55,.10);}
.tp-card.done{opacity:.38;}
.tp-card-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px 2px 4px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:5px;}
.tp-card-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:#1f2937;line-height:1.2;margin-bottom:5px;}
.tp-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px;}
.tp-chip{background:#f1f4fa;border:1px solid #dde2ec;border-radius:3px;padding:2px 6px;font-size:11px;color:#5b6478;font-weight:500;}
.tp-ex-cnt{font-size:12px;color:#5b6478;font-weight:500;margin-bottom:4px;}
.tp-card-note{font-size:11px;color:#7b849a;font-style:italic;margin-top:3px;line-height:1.4;}
.tp-card-ft{display:flex;align-items:center;justify-content:flex-end;gap:3px;opacity:0;transition:opacity .15s;margin-top:6px;padding-top:6px;border-top:1px solid #eaeef5;}
.tp-card:hover .tp-card-ft{opacity:1;}
.tp-ca{background:#f4f6fb;border:1px solid #e1e6f0;padding:5px 6px;cursor:pointer;color:#7b849a;border-radius:6px;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.tp-ca:hover{background:#eaeef5;border-color:#c9d1e0;}
.tp-ca.dn{color:#6b7280;}.tp-ca.dn:hover{color:#b4f13a;border-color:#b4f13a40;background:#b4f13a10;}
.tp-ca.ed:hover{color:#60a5fa;border-color:#60a5fa40;background:#60a5fa10;}
.tp-ca.dl:hover{color:#f87171;border-color:#f8717140;background:#f8717110;}
.tp-ca.tr:hover{color:#7c50c8;border-color:#7c50c840;background:#7c50c810;}
.tp-rest-card{border:1px dashed #c9d1e0;border-radius:9px;padding:10px;text-align:center;color:#94a0b4;font-size:12px;font-weight:500;background:#fbfcfe;}

/* ── WORKOUT PLAN MODAL — exercise rows ── */
.tp-plan-ex-list{display:flex;flex-direction:column;gap:3px;}
.tp-plan-ex-row{background:#fff;border:1px solid #e1e6f0;border-radius:8px;padding:10px 12px;cursor:pointer;text-align:left;width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-plan-ex-row:hover{background:#f4f6fb;border-color:#c9d1e0;}
.tp-plan-ex-row:hover .tp-plan-ex-name{color:#65a30d;}
.tp-plan-ex-row:hover .tp-plan-ex-arrow{color:#65a30d;}
.tp-plan-ex-left{display:flex;flex-direction:column;gap:2px;min-width:0;}
.tp-plan-ex-name{font-size:14px;font-weight:600;color:#1f2937;}
.tp-plan-ex-detail{font-size:11px;color:#7b849a;}
.tp-plan-ex-arrow{color:#b4bccc;flex-shrink:0;transition:color .15s;}

/* ── WORKOUT PLAN MODAL — discipline-colored left accent ── */
.tp-plan-modal{border-left:3px solid var(--dc,#b4f13a);}

/* ── OVERLAY / MODAL ── */
.tp-ov{position:fixed;inset:0;background:rgba(8,12,20,.87);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);}
.tp-modal{background:#fff;border:1px solid #d4dbe8;border-radius:16px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;position:relative;box-shadow:0 16px 50px rgba(20,30,55,.28);}
.tp-modal-w{max-width:640px;}
.tp-mi{padding:22px;}
.tp-mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.tp-mt{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:#1f2937;}
.tp-x{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:7px;padding:4px;cursor:pointer;color:#7b849a;display:flex;transition:all .15s;}
.tp-x:hover{background:#eaeef5;color:#1f2937;}

/* ── FORM ── */
.tp-f{margin-bottom:13px;}
.tp-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7b849a;margin-bottom:5px;}
.tp-inp,.tp-sel,.tp-ta{width:100%;background:#fff;border:1px solid #d4dbe8;border-radius:8px;color:#1f2937;font-size:14px;font-family:'DM Sans',sans-serif;padding:8px 11px;outline:none;transition:border-color .15s;}
.tp-inp:focus,.tp-sel:focus,.tp-ta:focus{border-color:#a3e02e;}
.tp-inp::placeholder,.tp-ta::placeholder,.tp-sm::placeholder{color:#aab4c5;}
.tp-ta{resize:vertical;min-height:68px;}
.tp-sel option{background:#fff;}
.tp-sm{background:#fff;border:1px solid #d4dbe8;border-radius:6px;color:#1f2937;font-size:12px;font-family:'DM Sans',sans-serif;padding:5px 7px;outline:none;transition:border-color .15s;width:100%;}
.tp-sm:focus{border-color:#a3e02e;}

/* Discipline grid */
.tp-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;}
.tp-db{background:#fff;border:2px solid #d4dbe8;border-radius:9px;padding:10px 6px;cursor:pointer;text-align:center;transition:all .15s;}
.tp-db:hover{border-color:#b8c4d8;}
.tp-db.sel{border-color:var(--dc);background:#f4f6fb;}
.tp-db-ic{font-size:20px;line-height:1;}
.tp-db-nm{font-size:10px;font-weight:700;color:#7b849a;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;}

/* Section box */
.tp-sec{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:10px;padding:11px;margin-bottom:11px;}
.tp-sec-t{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7b849a;margin-bottom:9px;}

/* Param row */
.tp-pr{display:grid;grid-template-columns:1fr 68px 78px 24px;gap:5px;align-items:center;margin-bottom:5px;}

/* Exercise row */
.tp-er{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;align-items:center;margin-bottom:4px;}
.tp-eh{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;margin-bottom:3px;}
.tp-clbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#94a0b4;text-align:center;}
.tp-clbl:first-child{text-align:left;}

.tp-rm{background:none;border:none;cursor:pointer;color:#b4bccc;padding:3px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.tp-rm:hover{background:#f871710f;color:#ef4444;}
.tp-add-r{background:none;border:1px dashed #cbd5e6;border-radius:6px;padding:5px;cursor:pointer;font-size:12px;color:#7b849a;transition:all .15s;width:100%;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:4px;font-family:'DM Sans',sans-serif;}
.tp-add-r:hover{border-color:#a3e02e;color:#65a30d;background:#b4f13a12;}

/* Rest toggle */
.tp-rt{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #d4dbe8;border-radius:8px;cursor:pointer;margin-bottom:13px;transition:all .15s;}
.tp-rt:hover{border-color:#b8c4d8;}
.tp-rt.on{border-color:#a5a5e0;background:#7c50c810;}
.tp-tg{width:32px;height:18px;background:#d4dbe8;border-radius:9px;position:relative;transition:background .2s;flex-shrink:0;}
.tp-tg.on{background:#b4f13a30;border:1px solid #a3e02e;}
.tp-tg::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#b4bccc;border-radius:50%;transition:transform .2s,background .2s;}
.tp-tg.on::after{transform:translateX(13px);background:#65a30d;}

/* Modal footer */
.tp-mf{display:flex;gap:7px;justify-content:flex-end;margin-top:15px;padding-top:13px;border-top:1px solid #eaeef5;}
.tp-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-bg{background:transparent;color:#7b849a;border:1px solid #d4dbe8;}
.tp-bg:hover{background:#f4f6fb;color:#1f2937;}
.tp-bl{background:#b4f13a;color:#111827;}
.tp-bl:hover{background:#c8ff50;}
.tp-bp{background:linear-gradient(135deg,#5b5bd4,#7c50c8);color:#fff;}
.tp-bp:hover{background:linear-gradient(135deg,#6c6ce4,#8d60d8);}
.tp-btn:disabled{opacity:.4;cursor:not-allowed;}

/* AI modal */
.tp-ai-box{background:linear-gradient(135deg,#5b5bd418,#7c50c818);border:1px solid #5b5bd430;border-radius:10px;padding:14px;margin-bottom:13px;}
.tp-ai-hint{font-size:13px;color:#7b849a;line-height:1.6;}
.tp-spinner{width:34px;height:34px;border:3px solid #d4dbe8;border-top-color:#7c50c8;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;}
@keyframes spin{to{transform:rotate(360deg);}}
.tp-loading{text-align:center;padding:36px 0;color:#7b849a;font-size:14px;}
.tp-loading p{margin-top:11px;}
.tp-prev{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:8px;padding:11px;max-height:240px;overflow-y:auto;font-size:11px;color:#5b6478;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;}

/* Import */
.tp-imp-eg{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:8px;padding:10px;font-size:11px;color:#5b6478;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;max-height:130px;overflow-y:auto;}
.tp-err{font-size:12px;color:#dc2626;margin-top:5px;}

/* Category */
.tp-cat-item{display:flex;align-items:center;gap:8px;background:#f4f6fb;border:1px solid #e1e6f0;border-radius:8px;padding:8px 10px;margin-bottom:5px;}
.tp-cat-nm{font-size:14px;font-weight:500;color:#1f2937;flex:1;}
.tp-cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.tp-color-in{width:30px;height:26px;border-radius:5px;border:none;cursor:pointer;padding:0;background:none;}

/* Auth */
.tp-auth-tabs{display:flex;gap:4px;margin-bottom:16px;}
.tp-auth-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #d4dbe8;background:transparent;color:#7b849a;font-family:'DM Sans',sans-serif;transition:all .15s;}
.tp-auth-tab:hover{background:#f4f6fb;color:#1f2937;}
.tp-auth-tab.active{background:#b4f13a18;border-color:#a3e02e;color:#65a30d;}
.tp-user-name{font-size:12px;font-weight:600;color:#7b849a;white-space:nowrap;}

/* Time & Recurrence */
.tp-time-rec{display:flex;gap:10px;margin-bottom:4px;}
.tp-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.tp-card-meta{display:flex;align-items:center;gap:5px;}
.tp-card-time{display:flex;align-items:center;gap:2px;font-size:10px;font-weight:600;color:#5b6478;background:#f1f4fa;border:1px solid #dde2ec;border-radius:3px;padding:1px 5px;}
.tp-card-rec-ic{color:#7c50c8;}
.tp-rec-days{display:flex;gap:4px;flex-wrap:wrap;}
.tp-rec-day{background:#fff;border:1px solid #d4dbe8;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;color:#7b849a;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-rec-day:hover{border-color:#b8c4d8;color:#1f2937;}
.tp-rec-day.sel{background:#b4f13a18;border-color:#a3e02e;color:#65a30d;}
.tp-rec-hint{display:flex;align-items:center;gap:5px;font-size:12px;color:#7c50c8;background:#7c50c810;border:1px solid #7c50c825;border-radius:7px;padding:6px 10px;margin-bottom:11px;}
input[type="time"],input[type="date"]{color-scheme:light;}

/* Tracking */
.tp-track-info{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.tp-track-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;color:#1f2937;}
.tp-feelings{display:flex;gap:4px;}
.tp-feel{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:1px solid #d4dbe8;border-radius:8px;background:transparent;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-feel:hover{border-color:#b8c4d8;background:#f4f6fb;}
.tp-feel.sel{border-color:#a3e02e;background:#b4f13a14;}
.tp-feel-lbl{font-size:9px;font-weight:600;color:#7b849a;text-transform:uppercase;letter-spacing:.5px;}
.tp-feel.sel .tp-feel-lbl{color:#65a30d;}
.tp-track-hdr{display:grid;grid-template-columns:1fr 60px 1fr 50px;gap:6px;margin-bottom:4px;}
.tp-track-hdr span{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#94a0b4;}
.tp-track-row{display:grid;grid-template-columns:1fr 60px 1fr 50px;gap:6px;align-items:center;margin-bottom:4px;}
.tp-track-label{font-size:12px;color:#5b6478;font-weight:500;}
.tp-track-plan{font-size:12px;color:#7b849a;text-align:center;}
.tp-track-unit{font-size:11px;color:#7b849a;text-align:center;}
.tp-track-ex{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:8px;padding:8px;margin-bottom:6px;}
.tp-track-ex-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;color:#1f2937;margin-bottom:6px;}
.tp-track-ex-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.tp-track-col{display:flex;flex-direction:column;gap:2px;}
.tp-track-col-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a0b4;}
.tp-track-col-plan{font-size:11px;color:#7b849a;}
/* Stats */
.tp-stats-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
.tp-stat-card{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:10px;padding:14px 10px;text-align:center;}
.tp-stat-val{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;color:#1f2937;line-height:1;}
.tp-stat-lbl{font-size:10px;font-weight:600;color:#7b849a;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;}
.tp-stat-disc{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.tp-stat-disc-icon{font-size:14px;}
.tp-stat-disc-name{font-size:12px;color:#5b6478;width:70px;font-weight:500;}
.tp-stat-bar-wrap{flex:1;height:6px;background:#e1e6f0;border-radius:3px;overflow:hidden;}
.tp-stat-bar{height:100%;border-radius:3px;transition:width .4s;}
.tp-stat-disc-cnt{font-size:11px;font-weight:700;color:#5b6478;min-width:24px;text-align:right;}
.tp-stat-weeks{display:flex;gap:4px;align-items:flex-end;height:80px;padding-top:10px;}
.tp-stat-week{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;}
.tp-stat-week-bar{width:100%;background:#a3e02e;border-radius:3px 3px 0 0;min-height:4px;transition:height .3s;}
.tp-stat-week-cnt{font-size:10px;font-weight:700;color:#65a30d;}
.tp-stat-week-lbl{font-size:8px;color:#7b849a;text-align:center;}

/* Log history */
.tp-log-list{max-height:400px;overflow-y:auto;}
.tp-log-item{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:8px;padding:10px;margin-bottom:6px;}
.tp-log-top{display:flex;align-items:center;gap:6px;}
.tp-log-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;color:#1f2937;flex:1;}
.tp-log-feel{font-size:14px;}
.tp-log-date{font-size:10px;color:#7b849a;}
.tp-log-exs{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;}

/* Card logged indicator */
.tp-card-logged{display:inline-flex;align-items:center;gap:2px;font-size:9px;font-weight:700;color:#22c55e;background:#22c55e18;border:1px solid #22c55e30;border-radius:3px;padding:1px 5px;letter-spacing:.3px;}

/* Journal modal */
.tp-journal-list{max-height:450px;overflow-y:auto;}
.tp-journal-entry{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:10px;padding:12px;margin-bottom:8px;transition:border-color .15s;}
.tp-journal-entry:hover{border-color:#b8c4d8;}
.tp-journal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.tp-journal-date{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:#1f2937;}
.tp-journal-meta{display:flex;align-items:center;gap:6px;font-size:14px;}
.tp-journal-params{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}
.tp-journal-exercises{margin-bottom:6px;}
.tp-journal-ex-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eaeef5;}
.tp-journal-ex-row:last-child{border-bottom:none;}
.tp-journal-ex-name{font-size:13px;font-weight:600;color:#1f2937;}
.tp-journal-ex-detail{font-size:13px;color:#5b6478;font-weight:500;}
.tp-journal-plan-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eaeef5;}
.tp-journal-plan-row:last-child{border-bottom:none;}
.tp-journal-note{font-size:12px;color:#7b849a;font-style:italic;margin-top:4px;padding-top:6px;border-top:1px solid #eaeef5;}

/* ── DAY VIEW ── */
.tp-dayview{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#eef1f6;}

/* Day strip */
.tp-dv-strip{display:flex;gap:6px;padding:12px 28px;background:#aab4c5;border-bottom:1px solid #9faaba;flex-shrink:0;overflow-x:auto;transition:padding .22s ease;}
.tp-dv-strip.compact{padding:4px 28px;}
.tp-dv-strip.compact .tp-dv-strip-d{padding:3px 8px;min-width:54px;flex-direction:row;align-items:center;gap:6px;}
.tp-dv-strip.compact .tp-dv-strip-top{margin:0;}
.tp-dv-strip.compact .tp-dv-strip-num{font-size:13px;}
.tp-dv-strip.compact .tp-dv-strip-day{font-size:9px;}
.tp-dv-strip.compact .tp-dv-strip-dots{display:none;}
.tp-dv-strip.compact .tp-dv-strip-rest{display:none;}
.tp-dv-strip-d{flex:1;min-width:78px;background:#c3cbda;border:1px solid #9faaba;border-radius:8px;padding:8px 10px;cursor:pointer;transition:all .22s ease;display:flex;flex-direction:column;gap:3px;font-family:'DM Sans',sans-serif;box-shadow:0 1px 2px rgba(20,30,55,.04);}
.tp-dv-strip-num,.tp-dv-strip-day{transition:font-size .22s ease;}
.tp-dv-strip-d:hover{border-color:#c9d1e0;}
.tp-dv-strip-d.sel{border-color:#a3e02e;background:#b4f13a18;}
.tp-dv-strip-d.today-d{border-color:#cbe89c;}
.tp-dv-strip-top{display:flex;align-items:baseline;justify-content:space-between;gap:6px;}
.tp-dv-strip-day{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a0b4;}
.tp-dv-strip-d.sel .tp-dv-strip-day{color:#65a30d;}
.tp-dv-strip-num{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;color:#1f2937;line-height:1;}
.tp-dv-strip-d.sel .tp-dv-strip-num{color:#65a30d;}
.tp-dv-strip-dots{display:flex;gap:2px;align-items:center;margin-top:2px;min-height:6px;}
.tp-dv-strip-dot{width:5px;height:5px;border-radius:50%;}
.tp-dv-strip-rest{font-size:9px;color:#b4bccc;font-style:italic;}

/* Day header */
.tp-dv-hdr{padding:18px 28px 16px;border-bottom:1px solid #9faaba;display:flex;align-items:center;gap:16px;flex-shrink:0;background:#bac3d2;transition:padding .22s ease,background .22s ease;}
.tp-dv-hdr.compact{padding:6px 28px;}
.tp-dv-hdr.compact .tp-dv-dnum{font-size:24px;}
.tp-dv-hdr.compact .tp-dv-dname{font-size:14px;}
.tp-dv-hdr.compact .tp-dv-dsub{display:none;}
.tp-dv-hdr.compact .tp-dv-summary-val{font-size:14px;}
.tp-dv-hdr.compact .tp-dv-summary-lbl{font-size:8px;}
.tp-dv-hdr.compact .tp-dv-tag-today{font-size:8px;padding:2px 5px;}
.tp-dv-dnum,.tp-dv-dname,.tp-dv-dsub,.tp-dv-summary-val,.tp-dv-tag-today{transition:font-size .22s ease,padding .22s ease;}
.tp-dv-date-block{display:flex;align-items:baseline;gap:10px;}
.tp-dv-dnum{font-family:'Barlow Condensed',sans-serif;font-size:54px;font-weight:800;line-height:1;color:#65a30d;letter-spacing:-1px;}
.tp-dv-dnum.not-today{color:#1f2937;}
.tp-dv-dmeta{display:flex;flex-direction:column;gap:2px;}
.tp-dv-dname{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:#1f2937;line-height:1;}
.tp-dv-dsub{font-size:12px;color:#94a0b4;letter-spacing:.3px;text-transform:uppercase;font-weight:600;}
.tp-dv-tag-today{font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#1f2937;background:#b4f13a;padding:3px 8px;border-radius:4px;margin-left:8px;}
.tp-dv-spacer{flex:1;}
.tp-dv-summary{display:flex;gap:14px;align-items:center;}
.tp-dv-summary-item{display:flex;flex-direction:column;align-items:flex-end;gap:2px;white-space:nowrap;}
.tp-dv-summary-val{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:#1f2937;line-height:1;}
.tp-dv-summary-val.lime{color:#65a30d;}
.tp-dv-summary-lbl{font-size:9px;font-weight:700;color:#94a0b4;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;}

/* Timeline body */
.tp-dv-body{flex:1;overflow-y:auto;padding:24px 28px 32px;display:grid;grid-template-columns:minmax(70px,90px) 1fr;gap:0;align-content:start;}
.tp-dv-hour{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#b4bccc;padding:4px 14px 0 0;border-right:1px solid #dde2ec;text-align:right;letter-spacing:.5px;height:64px;}
.tp-dv-hour.now{color:#65a30d;}
.tp-dv-slot{position:relative;border-bottom:1px dashed #e1e6f0;min-height:64px;padding:6px 6px 6px 16px;display:flex;flex-direction:column;gap:6px;}
.tp-dv-slot:hover{background:#e6eaf2;}
.tp-dv-slot.empty{cursor:pointer;}
.tp-dv-slot.empty:hover{background:#b4f13a12;}
.tp-dv-slot.empty:hover::before{content:'+ Dodaj o tej godzinie';position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#65a30d;font-size:11px;font-weight:600;letter-spacing:.3px;pointer-events:none;}

/* Now line */
.tp-dv-nowline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#a8d92a 12%,#a8d92a 92%,transparent);z-index:5;pointer-events:none;box-shadow:0 0 8px rgba(168,217,42,.5);}
.tp-dv-nowline::before{content:'';position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:50%;background:#a8d92a;box-shadow:0 0 8px rgba(168,217,42,.6);}
.tp-dv-nowline-lbl{position:absolute;left:-58px;top:-9px;width:46px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:#111827;background:#a8d92a;padding:1px 6px;border-radius:4px;letter-spacing:.4px;box-shadow:0 1px 4px rgba(168,217,42,.3);font-variant-numeric:tabular-nums;}

/* Day card */
.tp-dv-card{background:#fff;border:1px solid #d4dbe8;border-radius:10px;padding:12px 14px;cursor:pointer;transition:all .15s;border-left:3px solid var(--dc,#b4f13a);box-shadow:0 1px 3px rgba(20,30,55,.06);}
.tp-dv-card:hover{border-color:#b8c4d8;border-left-color:var(--dc,#b4f13a);box-shadow:0 6px 18px rgba(20,30,55,.10);}
.tp-dv-card.done{opacity:.5;}
.tp-dv-card-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.tp-dv-card-time{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#5b6478;display:flex;align-items:center;gap:4px;}
.tp-dv-card-title{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;color:#1f2937;line-height:1.1;flex:1;}
.tp-dv-card-disc{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;padding:2px 8px;border-radius:4px;}
.tp-dv-card-body{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start;}
.tp-dv-card-col{flex:1;min-width:140px;}
.tp-dv-card-col-lbl{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a0b4;margin-bottom:4px;}
.tp-dv-card-exlist{display:flex;flex-direction:column;gap:2px;}
.tp-dv-card-exrow{display:flex;justify-content:space-between;font-size:12px;color:#1f2937;padding:2px 0;border-bottom:1px solid #eaeef5;}
.tp-dv-card-exrow:last-child{border-bottom:none;}
.tp-dv-card-exrow b{font-weight:600;color:#1f2937;}
.tp-dv-card-exrow span{color:#7b849a;font-variant-numeric:tabular-nums;}
.tp-dv-card-note{font-size:12px;color:#7b849a;font-style:italic;margin-top:8px;padding-top:8px;border-top:1px solid #eaeef5;line-height:1.5;}
.tp-dv-card-ft{display:flex;gap:5px;margin-top:10px;padding-top:8px;border-top:1px solid #eaeef5;justify-content:flex-end;}
.tp-dv-rest{border:1px dashed #c9d1e0;border-radius:10px;padding:14px;text-align:center;color:#7b849a;font-size:13px;font-style:italic;background:linear-gradient(135deg,#7c50c810,#ffffff);}
.tp-dv-empty-day{grid-column:1 / -1;padding:80px 20px;text-align:center;color:#374151;}
.tp-dv-empty-day h3{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;color:#5b6478;margin-bottom:8px;}
.tp-dv-empty-day p{font-size:13px;color:#94a0b4;margin-bottom:16px;}

/* ── RESPONSIVE ── */

/* Tablet */
@media(max-width:1024px){
.tp-board{grid-template-columns:repeat(4,1fr);}
.tp-day-n{font-size:24px;}
.tp-hbtn .tp-hbtn-text{display:none;}
}

/* Mobile */
@media(max-width:768px){
.tp{overflow:auto;}
.tp-hdr{height:auto;flex-wrap:wrap;padding:10px 12px;gap:6px;}
.tp-logo{font-size:17px;}
.tp-wrange{font-size:13px;min-width:auto;}
.tp-div{display:none;}
.tp-prog-bar{width:50px;}
.tp-hbtn{padding:5px 8px;font-size:11px;}
.tp-hbtn-ic{padding:4px;}
.tp-btn-lime,.tp-btn-ai{padding:6px 10px;}

.tp-board{grid-template-columns:repeat(2,1fr);height:auto;overflow:visible;}
.tp-col{min-height:auto;}
.tp-col-hd{padding:8px 8px 6px;}
.tp-col-body{padding:5px;max-height:none;overflow:visible;}
.tp-day-n{font-size:22px;}
.tp-day-s{font-size:9px;}

.tp-card{padding:8px 9px 6px;}
.tp-card-title{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.tp-card-ft{opacity:1;margin-top:6px;gap:4px;}
.tp-ca{padding:5px 7px;}

.tp-ov{padding:10px;}
.tp-mi{padding:16px;}
.tp-modal{max-width:100%;border-radius:12px;}
.tp-mt{font-size:18px;}

.tp-er{grid-template-columns:1fr 40px 40px 50px 60px 24px;gap:3px;}
.tp-eh{grid-template-columns:1fr 40px 40px 50px 60px 24px;gap:3px;}
.tp-pr{grid-template-columns:1fr 60px 70px 24px;gap:4px;}

.tp-user-name{display:none;}
}

/* Small phone */
@media(max-width:480px){
.tp-board{grid-template-columns:1fr;}
.tp-col-hd{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:2px solid transparent;}
.tp-col-hd.today{border-bottom-color:#b4f13a;}
.tp-col-hd-top{margin-bottom:0;}
.tp-day-n{font-size:18px;}
.tp-day-s{font-size:11px;letter-spacing:1px;}
.tp-col-body{flex-direction:row;flex-wrap:wrap;gap:6px;padding:8px 12px;}
.tp-card{flex:1;min-width:calc(50% - 3px);}
.tp-rest-card{flex:1;min-width:calc(50% - 3px);}

.tp-hdr{gap:5px;}
.tp-logo{font-size:15px;}
.tp-wrange{font-size:12px;}
.tp-hbtn{padding:4px 7px;font-size:10px;}
.tp-spacer{display:none;}

.tp-card-title{font-size:13px;}
.tp-card-badge{font-size:9px;}
.tp-chip{font-size:9px;padding:1px 4px;}

.tp-time-rec{flex-direction:column;gap:0;}

.tp-eh{display:none;}
.tp-er{grid-template-columns:1fr 1fr 1fr 1fr 24px;gap:4px;row-gap:3px;margin-bottom:8px;}
.tp-er>*:first-child{grid-column:1 / -1;}
}

/* Tablet - day view */
@media(max-width:1024px){
.tp-dv-strip{padding:10px 16px;}
.tp-dv-hdr{padding:14px 16px 12px;}
.tp-dv-body{padding:16px 16px 24px;}
}
/* Mobile - day view */
@media(max-width:768px){
.tp-dv-strip{padding:8px 12px;gap:4px;}
.tp-dv-strip-d{min-width:52px;padding:6px 8px;}
.tp-dv-hdr{padding:12px 16px 10px;}
.tp-dv-dnum{font-size:38px;}
.tp-dv-dname{font-size:17px;}
.tp-dv-body{padding:12px 12px 20px;grid-template-columns:60px 1fr;}
.tp-dv-nowline-lbl{left:-50px;width:38px;font-size:10px;}
.tp-dv-summary{gap:8px;}
.tp-dv-summary-val{font-size:17px;}
}

/* ── EXERCISE MODAL ── */
.tp-ex-ov{align-items:flex-start;padding:0;height:100vh;height:100dvh;}
.tp-ex-modal{background:#fff;border:1px solid #d4dbe8;width:100%;max-width:560px;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;display:flex;flex-direction:column;border-radius:0;margin:0 auto;box-shadow:0 16px 50px rgba(20,30,55,.28);}
@media(min-width:600px){
  .tp-ex-ov{align-items:center;padding:16px;height:auto;}
  .tp-ex-modal{height:auto;max-height:92vh;max-height:92dvh;border-radius:16px;}
}
.tp-ex-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 20px 0;flex-shrink:0;}
.tp-ex-hdr-left{display:flex;flex-direction:column;gap:5px;min-width:0;}
.tp-ex-name{font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:#1f2937;line-height:1.1;margin:0;}
.tp-ex-subtitle{font-size:11px;color:#7b849a;font-weight:500;}
.tp-ex-body{flex:1;overflow-y:auto;padding:16px 20px;min-height:0;-webkit-overflow-scrolling:touch;}
.tp-ex-date-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:10px;}
.tp-ex-date-inp{width:auto;max-width:160px;}
.tp-ex-sets-section{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:12px;padding:12px;margin-bottom:12px;}
.tp-ex-sets-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.tp-ex-vol-badge{font-size:11px;color:#65a30d;font-weight:600;background:#b4f13a18;border:1px solid #a3e02e;border-radius:5px;padding:2px 8px;}
.tp-ex-col-hdr{display:grid;grid-template-columns:28px 1fr 1fr 1fr 1fr 28px;gap:4px;margin-bottom:4px;}
.tp-ex-col-hdr span{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#94a0b4;text-align:center;}
.tp-ex-col-hdr span:first-child{text-align:left;}
.tp-ex-rows{display:flex;flex-direction:column;gap:4px;}
.tp-ex-row{display:grid;grid-template-columns:28px 1fr 1fr 1fr 1fr 28px;gap:4px;align-items:center;border-radius:7px;padding:3px;transition:background .12s;}
.tp-ex-row.filled{background:#e6edf7;}
.tp-ex-set-num{font-size:11px;font-weight:700;color:#94a0b4;text-align:center;}
.tp-ex-plan-val{font-size:12px;color:#7b849a;text-align:center;font-weight:500;}
.tp-ex-inp{background:#fff;border:1px solid #d4dbe8;border-radius:6px;color:#1f2937;font-size:13px;font-family:'DM Sans',sans-serif;padding:5px 4px;outline:none;transition:border-color .15s;width:100%;text-align:center;font-weight:600;}
.tp-ex-inp:focus{border-color:#a3e02e;}
.tp-ex-del-row{background:none;border:none;cursor:pointer;color:#b4bccc;border-radius:5px;padding:4px;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.tp-ex-del-row:hover:not(:disabled){color:#ef4444;}
.tp-ex-del-row:disabled{opacity:.25;cursor:not-allowed;}
.tp-ex-add-row{display:flex;align-items:center;gap:5px;margin-top:8px;background:none;border:1px dashed #cbd5e6;border-radius:7px;color:#7b849a;font-size:12px;font-weight:600;cursor:pointer;padding:6px 10px;width:100%;justify-content:center;transition:all .12s;font-family:'DM Sans',sans-serif;}
.tp-ex-add-row:hover{border-color:#a3e02e;color:#65a30d;background:#b4f13a12;}
.tp-ex-chart-wrap{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:12px;padding:12px;margin-bottom:12px;}
.tp-ex-chart-title{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#7b849a;margin-bottom:8px;}
.tp-ex-chart-svg{display:block;width:100%;overflow:visible;}
.tp-ex-hist{background:#f4f6fb;border:1px solid #e1e6f0;border-radius:12px;padding:12px;margin-bottom:12px;}
.tp-ex-hist-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.tp-ex-hist-nav{display:flex;align-items:center;gap:4px;}
.tp-ex-hist-nav .tp-hbtn-ic{background:#fff;border:1px solid #d4dbe8;color:#7b849a;}
.tp-ex-hist-nav .tp-hbtn-ic:hover:not(:disabled){background:#eaeef5;color:#1f2937;}
.tp-ex-hist-pages{font-size:11px;color:#7b849a;}
.tp-ex-hist-entry{padding:8px 0;border-bottom:1px solid #eaeef5;}
.tp-ex-hist-entry:last-child{border-bottom:none;padding-bottom:0;}
.tp-ex-hist-entry.is-today{background:#b4f13a10;border-radius:7px;padding:8px;margin:0 -4px;}
.tp-ex-hist-date{font-size:11px;font-weight:700;color:#7b849a;margin-bottom:5px;display:flex;align-items:center;gap:6px;}
.tp-ex-today-badge{font-size:9px;font-weight:700;background:#b4f13a20;color:#65a30d;border-radius:4px;padding:1px 5px;letter-spacing:.5px;text-transform:uppercase;}
.tp-ex-hist-sets{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:3px;}
.tp-ex-hist-chip{font-size:10px;color:#5b6478;}
.tp-ex-hist-vol{font-size:10px;color:#94a0b4;font-style:italic;}
.tp-ex-completed{font-size:12px;color:#7b849a;font-weight:600;}
.tp-ex-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 20px;padding-bottom:calc(14px + env(safe-area-inset-bottom));border-top:1px solid #eaeef5;flex-shrink:0;background:#fff;}
.tp-ex-footer-actions{display:flex;gap:8px;}
.tp-btn-saved{background:#ecfccb !important;border-color:#a3e02e !important;color:#3f6212 !important;}
`

export default CSS
