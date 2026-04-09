const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.tp{font-family:'DM Sans',sans-serif;background:#111827;min-height:100vh;color:#d1d5db;display:flex;flex-direction:column;overflow:hidden;}

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

/* ── BOARD ── */
.tp-board{display:grid;grid-template-columns:repeat(7,1fr);flex:1;gap:1px;background:#1e293b;overflow:hidden;height:calc(100vh - 56px);}

/* ── DAY COLUMN ── */
.tp-col{background:#111827;display:flex;flex-direction:column;overflow:hidden;}
.tp-col-hd{padding:10px 10px 8px;border-bottom:2px solid transparent;flex-shrink:0;transition:border-color .2s;}
.tp-col-hd.today{border-bottom-color:#b4f13a;}
.tp-col-hd-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;}
.tp-day-s{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#4b5563;}
.tp-day-s.today{color:#b4f13a;}
.tp-add-day{background:none;border:none;cursor:pointer;color:#374151;padding:2px;border-radius:4px;transition:all .15s;display:flex;}
.tp-add-day:hover{color:#b4f13a;background:#b4f13a15;}
.tp-day-n{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;line-height:1;color:#2d3748;}
.tp-day-n.today{color:#b4f13a;}
.tp-col-body{flex:1;overflow-y:auto;padding:7px;display:flex;flex-direction:column;gap:5px;}

::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#2a3348;border-radius:2px;}

/* ── CARD ── */
.tp-card{background:#1a2233;border:1px solid #2a3348;border-radius:9px;padding:10px 11px 8px;cursor:pointer;transition:border-color .15s,background .15s;position:relative;}
.tp-card:hover{border-color:#3b4a63;background:#1e293b;}
.tp-card.done{opacity:.38;}
.tp-card-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 7px 2px 4px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:5px;}
.tp-card-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:#e5e7eb;line-height:1.2;margin-bottom:5px;}
.tp-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px;}
.tp-chip{background:#1e293b;border:1px solid #334155;border-radius:3px;padding:2px 6px;font-size:11px;color:#8b95a8;font-weight:500;}
.tp-ex-cnt{font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;}
.tp-card-note{font-size:11px;color:#6b7280;font-style:italic;margin-top:3px;line-height:1.4;}
.tp-card-ft{display:flex;align-items:center;justify-content:flex-end;gap:3px;opacity:0;transition:opacity .15s;margin-top:6px;padding-top:6px;border-top:1px solid #253045;}
.tp-card:hover .tp-card-ft{opacity:1;}
.tp-ca{background:#111827;border:1px solid #2a3348;padding:5px 6px;cursor:pointer;color:#6b7280;border-radius:6px;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.tp-ca:hover{background:#253045;border-color:#3b4a63;}
.tp-ca.dn{color:#6b7280;}.tp-ca.dn:hover{color:#b4f13a;border-color:#b4f13a40;background:#b4f13a10;}
.tp-ca.ed:hover{color:#60a5fa;border-color:#60a5fa40;background:#60a5fa10;}
.tp-ca.dl:hover{color:#f87171;border-color:#f8717140;background:#f8717110;}
.tp-ca.tr:hover{color:#7c50c8;border-color:#7c50c840;background:#7c50c810;}
.tp-rest-card{border:1px dashed #2a3348;border-radius:9px;padding:10px;text-align:center;color:#4b5563;font-size:12px;font-weight:500;}

/* ── OVERLAY / MODAL ── */
.tp-ov{position:fixed;inset:0;background:rgba(8,12,20,.87);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);}
.tp-modal{background:#1a2233;border:1px solid #2a3a50;border-radius:16px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;position:relative;}
.tp-modal-w{max-width:640px;}
.tp-mi{padding:22px;}
.tp-mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.tp-mt{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:#e5e7eb;}
.tp-x{background:#1e293b;border:1px solid #2a3a50;border-radius:7px;padding:4px;cursor:pointer;color:#5b6478;display:flex;transition:all .15s;}
.tp-x:hover{background:#2a3a50;color:#d1d5db;}

/* ── FORM ── */
.tp-f{margin-bottom:13px;}
.tp-lbl{display:block;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b6478;margin-bottom:5px;}
.tp-inp,.tp-sel,.tp-ta{width:100%;background:#111827;border:1px solid #2a3348;border-radius:8px;color:#d1d5db;font-size:14px;font-family:'DM Sans',sans-serif;padding:8px 11px;outline:none;transition:border-color .15s;}
.tp-inp:focus,.tp-sel:focus,.tp-ta:focus{border-color:#b4f13a;}
.tp-ta{resize:vertical;min-height:68px;}
.tp-sel option{background:#1a2233;}
.tp-sm{background:#111827;border:1px solid #2a3348;border-radius:6px;color:#d1d5db;font-size:12px;font-family:'DM Sans',sans-serif;padding:5px 7px;outline:none;transition:border-color .15s;width:100%;}
.tp-sm:focus{border-color:#b4f13a;}

/* Discipline grid */
.tp-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;}
.tp-db{background:#111827;border:2px solid #2a3348;border-radius:9px;padding:10px 6px;cursor:pointer;text-align:center;transition:all .15s;}
.tp-db:hover{border-color:#3b4a63;}
.tp-db.sel{border-color:var(--dc);background:#ffffff06;}
.tp-db-ic{font-size:20px;line-height:1;}
.tp-db-nm{font-size:10px;font-weight:700;color:#6b7280;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;}

/* Section box */
.tp-sec{background:#111827;border:1px solid #2a3348;border-radius:10px;padding:11px;margin-bottom:11px;}
.tp-sec-t{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#5b6478;margin-bottom:9px;}

/* Param row */
.tp-pr{display:grid;grid-template-columns:1fr 68px 78px 24px;gap:5px;align-items:center;margin-bottom:5px;}

/* Exercise row */
.tp-er{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;align-items:center;margin-bottom:4px;}
.tp-eh{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;margin-bottom:3px;}
.tp-clbl{font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#4b5563;text-align:center;}
.tp-clbl:first-child{text-align:left;}

.tp-rm{background:none;border:none;cursor:pointer;color:#4b5563;padding:3px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.tp-rm:hover{background:#f871710a;color:#f87171;}
.tp-add-r{background:none;border:1px dashed #2a3348;border-radius:6px;padding:5px;cursor:pointer;font-size:12px;color:#5b6478;transition:all .15s;width:100%;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:4px;font-family:'DM Sans',sans-serif;}
.tp-add-r:hover{border-color:#b4f13a;color:#b4f13a;background:#b4f13a08;}

/* Rest toggle */
.tp-rt{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #2a3348;border-radius:8px;cursor:pointer;margin-bottom:13px;transition:all .15s;}
.tp-rt:hover{border-color:#3b4a63;}
.tp-rt.on{border-color:#505090;background:#50509010;}
.tp-tg{width:32px;height:18px;background:#2a3348;border-radius:9px;position:relative;transition:background .2s;flex-shrink:0;}
.tp-tg.on{background:#b4f13a25;border:1px solid #b4f13a60;}
.tp-tg::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#4b5563;border-radius:50%;transition:transform .2s,background .2s;}
.tp-tg.on::after{transform:translateX(13px);background:#b4f13a;}

/* Modal footer */
.tp-mf{display:flex;gap:7px;justify-content:flex-end;margin-top:15px;padding-top:13px;border-top:1px solid #2a3348;}
.tp-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-bg{background:transparent;color:#6b7280;border:1px solid #2a3348;}
.tp-bg:hover{background:#1e293b;color:#d1d5db;}
.tp-bl{background:#b4f13a;color:#111827;}
.tp-bl:hover{background:#c8ff50;}
.tp-bp{background:linear-gradient(135deg,#5b5bd4,#7c50c8);color:#fff;}
.tp-bp:hover{background:linear-gradient(135deg,#6c6ce4,#8d60d8);}
.tp-btn:disabled{opacity:.4;cursor:not-allowed;}

/* AI modal */
.tp-ai-box{background:linear-gradient(135deg,#5b5bd418,#7c50c818);border:1px solid #5b5bd430;border-radius:10px;padding:14px;margin-bottom:13px;}
.tp-ai-hint{font-size:13px;color:#7b849a;line-height:1.6;}
.tp-spinner{width:34px;height:34px;border:3px solid #2a3348;border-top-color:#7c50c8;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;}
@keyframes spin{to{transform:rotate(360deg);}}
.tp-loading{text-align:center;padding:36px 0;color:#6b7280;font-size:14px;}
.tp-loading p{margin-top:11px;}
.tp-prev{background:#111827;border:1px solid #2a3348;border-radius:8px;padding:11px;max-height:240px;overflow-y:auto;font-size:11px;color:#7b849a;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;}

/* Import */
.tp-imp-eg{background:#111827;border:1px solid #2a3348;border-radius:8px;padding:10px;font-size:11px;color:#5b6478;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;max-height:130px;overflow-y:auto;}
.tp-err{font-size:12px;color:#f87171;margin-top:5px;}

/* Category */
.tp-cat-item{display:flex;align-items:center;gap:8px;background:#111827;border:1px solid #2a3348;border-radius:8px;padding:8px 10px;margin-bottom:5px;}
.tp-cat-nm{font-size:14px;font-weight:500;color:#9ca3af;flex:1;}
.tp-cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.tp-color-in{width:30px;height:26px;border-radius:5px;border:none;cursor:pointer;padding:0;background:none;}

/* Auth */
.tp-auth-tabs{display:flex;gap:4px;margin-bottom:16px;}
.tp-auth-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #2a3348;background:transparent;color:#6b7280;font-family:'DM Sans',sans-serif;transition:all .15s;}
.tp-auth-tab:hover{background:#1e293b;color:#d1d5db;}
.tp-auth-tab.active{background:#b4f13a18;border-color:#b4f13a40;color:#b4f13a;}
.tp-user-name{font-size:12px;font-weight:600;color:#7b849a;white-space:nowrap;}

/* Time & Recurrence */
.tp-time-rec{display:flex;gap:10px;margin-bottom:4px;}
.tp-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.tp-card-meta{display:flex;align-items:center;gap:5px;}
.tp-card-time{display:flex;align-items:center;gap:2px;font-size:10px;font-weight:600;color:#7b849a;background:#1e293b;border:1px solid #334155;border-radius:3px;padding:1px 5px;}
.tp-card-rec-ic{color:#7c50c8;}
.tp-rec-days{display:flex;gap:4px;flex-wrap:wrap;}
.tp-rec-day{background:#111827;border:1px solid #2a3348;border-radius:6px;padding:4px 8px;font-size:11px;font-weight:600;color:#6b7280;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-rec-day:hover{border-color:#3b4a63;color:#d1d5db;}
.tp-rec-day.sel{background:#b4f13a18;border-color:#b4f13a40;color:#b4f13a;}
.tp-rec-hint{display:flex;align-items:center;gap:5px;font-size:12px;color:#7c50c8;background:#7c50c810;border:1px solid #7c50c825;border-radius:7px;padding:6px 10px;margin-bottom:11px;}
input[type="time"]{color-scheme:dark;}

/* Tracking */
.tp-track-info{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;}
.tp-track-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:17px;color:#e5e7eb;}
.tp-feelings{display:flex;gap:4px;}
.tp-feel{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:1px solid #2a3348;border-radius:8px;background:transparent;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-feel:hover{border-color:#3b4a63;background:#1e293b;}
.tp-feel.sel{border-color:#b4f13a40;background:#b4f13a10;}
.tp-feel-lbl{font-size:9px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;}
.tp-feel.sel .tp-feel-lbl{color:#b4f13a;}
.tp-track-hdr{display:grid;grid-template-columns:1fr 60px 1fr 50px;gap:6px;margin-bottom:4px;}
.tp-track-hdr span{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4b5563;}
.tp-track-row{display:grid;grid-template-columns:1fr 60px 1fr 50px;gap:6px;align-items:center;margin-bottom:4px;}
.tp-track-label{font-size:12px;color:#9ca3af;font-weight:500;}
.tp-track-plan{font-size:12px;color:#5b6478;text-align:center;}
.tp-track-unit{font-size:11px;color:#5b6478;text-align:center;}
.tp-track-ex{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:8px;margin-bottom:6px;}
.tp-track-ex-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;color:#d1d5db;margin-bottom:6px;}
.tp-track-ex-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
.tp-track-col{display:flex;flex-direction:column;gap:2px;}
.tp-track-col-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#4b5563;}
.tp-track-col-plan{font-size:11px;color:#5b6478;}
/* Stats */
.tp-stats-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;}
.tp-stat-card{background:#111827;border:1px solid #2a3348;border-radius:10px;padding:14px 10px;text-align:center;}
.tp-stat-val{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;color:#e5e7eb;line-height:1;}
.tp-stat-lbl{font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;}
.tp-stat-disc{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
.tp-stat-disc-icon{font-size:14px;}
.tp-stat-disc-name{font-size:12px;color:#9ca3af;width:70px;font-weight:500;}
.tp-stat-bar-wrap{flex:1;height:6px;background:#1e293b;border-radius:3px;overflow:hidden;}
.tp-stat-bar{height:100%;border-radius:3px;transition:width .4s;}
.tp-stat-disc-cnt{font-size:11px;font-weight:700;color:#7b849a;min-width:24px;text-align:right;}
.tp-stat-weeks{display:flex;gap:4px;align-items:flex-end;height:80px;padding-top:10px;}
.tp-stat-week{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;}
.tp-stat-week-bar{width:100%;background:#b4f13a;border-radius:3px 3px 0 0;min-height:4px;transition:height .3s;}
.tp-stat-week-cnt{font-size:10px;font-weight:700;color:#b4f13a;}
.tp-stat-week-lbl{font-size:8px;color:#5b6478;text-align:center;}

/* Log history */
.tp-log-list{max-height:400px;overflow-y:auto;}
.tp-log-item{background:#111827;border:1px solid #2a3348;border-radius:8px;padding:10px;margin-bottom:6px;}
.tp-log-top{display:flex;align-items:center;gap:6px;}
.tp-log-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;color:#d1d5db;flex:1;}
.tp-log-feel{font-size:14px;}
.tp-log-date{font-size:10px;color:#5b6478;}
.tp-log-exs{display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;}

/* Card logged indicator */
.tp-card-logged{display:inline-flex;align-items:center;gap:2px;font-size:9px;font-weight:700;color:#22c55e;background:#22c55e18;border:1px solid #22c55e30;border-radius:3px;padding:1px 5px;letter-spacing:.3px;}

/* Journal modal */
.tp-journal-list{max-height:450px;overflow-y:auto;}
.tp-journal-entry{background:#111827;border:1px solid #2a3348;border-radius:10px;padding:12px;margin-bottom:8px;transition:border-color .15s;}
.tp-journal-entry:hover{border-color:#3b4a63;}
.tp-journal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.tp-journal-date{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:#d1d5db;}
.tp-journal-meta{display:flex;align-items:center;gap:6px;font-size:14px;}
.tp-journal-params{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}
.tp-journal-exercises{margin-bottom:6px;}
.tp-journal-ex-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1e293b;}
.tp-journal-ex-row:last-child{border-bottom:none;}
.tp-journal-ex-name{font-size:13px;font-weight:600;color:#d1d5db;}
.tp-journal-ex-detail{font-size:13px;color:#9ca3af;font-weight:500;}
.tp-journal-plan-row{display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1e293b;}
.tp-journal-plan-row:last-child{border-bottom:none;}
.tp-journal-note{font-size:12px;color:#7b849a;font-style:italic;margin-top:4px;padding-top:6px;border-top:1px solid #1e293b;}

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
}
`

export default CSS
