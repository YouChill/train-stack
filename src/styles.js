const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

.tp{font-family:'DM Sans',sans-serif;background:#060610;min-height:100vh;color:#c0c0de;display:flex;flex-direction:column;overflow:hidden;}

/* ── HEADER ── */
.tp-hdr{height:56px;display:flex;align-items:center;gap:10px;padding:0 14px;background:#09091c;border-bottom:1px solid #13132a;flex-shrink:0;z-index:50;}
.tp-logo{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;letter-spacing:0.5px;color:#b4f13a;white-space:nowrap;}
.tp-logo em{color:#4a4a70;font-style:normal;}
.tp-div{width:1px;height:22px;background:#13132a;flex-shrink:0;}
.tp-wnav{display:flex;align-items:center;gap:6px;}
.tp-wrange{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:#9090b8;min-width:134px;text-align:center;letter-spacing:0.3px;}
.tp-prog{display:flex;align-items:center;gap:7px;}
.tp-prog-bar{width:66px;height:3px;background:#13132a;border-radius:2px;overflow:hidden;}
.tp-prog-fill{height:100%;background:#b4f13a;transition:width .4s;}
.tp-prog-txt{font-size:10px;font-weight:600;color:#505068;}
.tp-spacer{flex:1;}
.tp-hbtn{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #13132a;background:#0d0d22;color:#606080;transition:all .15s;white-space:nowrap;font-family:'DM Sans',sans-serif;}
.tp-hbtn:hover{background:#13132a;color:#c0c0de;}
.tp-hbtn-ic{background:#0d0d22;border:1px solid #13132a;color:#404060;padding:5px;border-radius:7px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.tp-hbtn-ic:hover{background:#13132a;color:#c0c0de;}
.tp-btn-lime{background:#b4f13a;border-color:transparent;color:#060610;font-weight:700;}
.tp-btn-lime:hover{background:#c8ff50;color:#060610;}
.tp-btn-ai{background:linear-gradient(135deg,#5b5bd4,#7c50c8);border-color:transparent;color:#fff;font-weight:700;}
.tp-btn-ai:hover{background:linear-gradient(135deg,#6c6ce4,#8d60d8);border-color:transparent;}

/* ── BOARD ── */
.tp-board{display:grid;grid-template-columns:repeat(7,1fr);flex:1;gap:1px;background:#0d0d20;overflow:hidden;height:calc(100vh - 56px);}

/* ── DAY COLUMN ── */
.tp-col{background:#060610;display:flex;flex-direction:column;overflow:hidden;}
.tp-col-hd{padding:10px 10px 8px;border-bottom:2px solid transparent;flex-shrink:0;transition:border-color .2s;}
.tp-col-hd.today{border-bottom-color:#b4f13a;}
.tp-col-hd-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;}
.tp-day-s{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#2a2a48;}
.tp-day-s.today{color:#b4f13a;}
.tp-add-day{background:none;border:none;cursor:pointer;color:#202040;padding:2px;border-radius:4px;transition:all .15s;display:flex;}
.tp-add-day:hover{color:#b4f13a;background:#b4f13a15;}
.tp-day-n{font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;line-height:1;color:#181830;}
.tp-day-n.today{color:#b4f13a;}
.tp-col-body{flex:1;overflow-y:auto;padding:7px;display:flex;flex-direction:column;gap:5px;}

::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#13132a;border-radius:2px;}

/* ── CARD ── */
.tp-card{background:#0b0b1e;border:1px solid #12122a;border-radius:9px;padding:9px 10px 7px;cursor:pointer;transition:border-color .15s,background .15s;position:relative;}
.tp-card:hover{border-color:#1e1e38;background:#0e0e24;}
.tp-card.done{opacity:.38;}
.tp-card-badge{display:inline-flex;align-items:center;gap:3px;padding:1px 6px 1px 3px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:5px;}
.tp-card-title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;color:#d0d0e8;line-height:1.2;margin-bottom:4px;}
.tp-chips{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px;}
.tp-chip{background:#0f0f28;border:1px solid #16163a;border-radius:3px;padding:1px 5px;font-size:9px;color:#505070;font-weight:500;}
.tp-ex-cnt{font-size:10px;color:#404060;font-weight:500;margin-bottom:3px;}
.tp-card-note{font-size:9px;color:#303050;font-style:italic;margin-top:2px;}
.tp-card-ft{display:flex;align-items:center;justify-content:flex-end;gap:2px;opacity:0;transition:opacity .15s;height:18px;margin-top:3px;}
.tp-card:hover .tp-card-ft{opacity:1;}
.tp-ca{background:none;border:none;padding:2px 3px;cursor:pointer;color:#303050;border-radius:4px;transition:all .12s;display:flex;}
.tp-ca:hover{background:#151535;}
.tp-ca.dn:hover{color:#b4f13a;}
.tp-ca.ed:hover{color:#60a5fa;}
.tp-ca.dl:hover{color:#f87171;}
.tp-rest-card{border:1px dashed #12122a;border-radius:9px;padding:10px;text-align:center;color:#242448;font-size:11px;font-weight:500;}

/* ── OVERLAY / MODAL ── */
.tp-ov{position:fixed;inset:0;background:rgba(2,2,12,.87);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);}
.tp-modal{background:#0b0b1e;border:1px solid #17173a;border-radius:16px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;position:relative;}
.tp-modal-w{max-width:640px;}
.tp-mi{padding:22px;}
.tp-mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.tp-mt{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:#e0e0f0;}
.tp-x{background:#11112a;border:1px solid #1a1a3a;border-radius:7px;padding:4px;cursor:pointer;color:#404060;display:flex;transition:all .15s;}
.tp-x:hover{background:#1a1a3a;color:#d0d0e8;}

/* ── FORM ── */
.tp-f{margin-bottom:13px;}
.tp-lbl{display:block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#383858;margin-bottom:5px;}
.tp-inp,.tp-sel,.tp-ta{width:100%;background:#07071a;border:1px solid #14143a;border-radius:8px;color:#b8b8d8;font-size:13px;font-family:'DM Sans',sans-serif;padding:8px 11px;outline:none;transition:border-color .15s;}
.tp-inp:focus,.tp-sel:focus,.tp-ta:focus{border-color:#b4f13a;}
.tp-ta{resize:vertical;min-height:68px;}
.tp-sel option{background:#0b0b1e;}
.tp-sm{background:#07071a;border:1px solid #14143a;border-radius:6px;color:#b8b8d8;font-size:11px;font-family:'DM Sans',sans-serif;padding:5px 7px;outline:none;transition:border-color .15s;width:100%;}
.tp-sm:focus{border-color:#b4f13a;}

/* Discipline grid */
.tp-dg{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;}
.tp-db{background:#07071a;border:2px solid #11112a;border-radius:9px;padding:10px 6px;cursor:pointer;text-align:center;transition:all .15s;}
.tp-db:hover{border-color:#1a1a3a;}
.tp-db.sel{border-color:var(--dc);background:#ffffff06;}
.tp-db-ic{font-size:20px;line-height:1;}
.tp-db-nm{font-size:9px;font-weight:700;color:#404060;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;}

/* Section box */
.tp-sec{background:#07071a;border:1px solid #11112a;border-radius:10px;padding:11px;margin-bottom:11px;}
.tp-sec-t{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#383858;margin-bottom:9px;}

/* Param row */
.tp-pr{display:grid;grid-template-columns:1fr 68px 78px 24px;gap:5px;align-items:center;margin-bottom:5px;}

/* Exercise row */
.tp-er{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;align-items:center;margin-bottom:4px;}
.tp-eh{display:grid;grid-template-columns:1.4fr 48px 48px 62px 74px 24px;gap:4px;margin-bottom:3px;}
.tp-clbl{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#282848;text-align:center;}
.tp-clbl:first-child{text-align:left;}

.tp-rm{background:none;border:none;cursor:pointer;color:#282848;padding:3px;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all .12s;}
.tp-rm:hover{background:#f871710a;color:#f87171;}
.tp-add-r{background:none;border:1px dashed #14143a;border-radius:6px;padding:5px;cursor:pointer;font-size:11px;color:#303050;transition:all .15s;width:100%;margin-top:3px;display:flex;align-items:center;justify-content:center;gap:4px;font-family:'DM Sans',sans-serif;}
.tp-add-r:hover{border-color:#b4f13a;color:#b4f13a;background:#b4f13a08;}

/* Rest toggle */
.tp-rt{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #11112a;border-radius:8px;cursor:pointer;margin-bottom:13px;transition:all .15s;}
.tp-rt:hover{border-color:#1a1a3a;}
.tp-rt.on{border-color:#505090;background:#50509010;}
.tp-tg{width:32px;height:18px;background:#11112a;border-radius:9px;position:relative;transition:background .2s;flex-shrink:0;}
.tp-tg.on{background:#b4f13a25;border:1px solid #b4f13a60;}
.tp-tg::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#303050;border-radius:50%;transition:transform .2s,background .2s;}
.tp-tg.on::after{transform:translateX(13px);background:#b4f13a;}

/* Modal footer */
.tp-mf{display:flex;gap:7px;justify-content:flex-end;margin-top:15px;padding-top:13px;border-top:1px solid #11112a;}
.tp-btn{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .15s;font-family:'DM Sans',sans-serif;}
.tp-bg{background:transparent;color:#484868;border:1px solid #14143a;}
.tp-bg:hover{background:#11112a;color:#b8b8d8;}
.tp-bl{background:#b4f13a;color:#060610;}
.tp-bl:hover{background:#c8ff50;}
.tp-bp{background:linear-gradient(135deg,#5b5bd4,#7c50c8);color:#fff;}
.tp-bp:hover{background:linear-gradient(135deg,#6c6ce4,#8d60d8);}
.tp-btn:disabled{opacity:.4;cursor:not-allowed;}

/* AI modal */
.tp-ai-box{background:linear-gradient(135deg,#5b5bd418,#7c50c818);border:1px solid #5b5bd430;border-radius:10px;padding:14px;margin-bottom:13px;}
.tp-ai-hint{font-size:12px;color:#6868a0;line-height:1.6;}
.tp-spinner{width:34px;height:34px;border:3px solid #14143a;border-top-color:#7c50c8;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto;}
@keyframes spin{to{transform:rotate(360deg);}}
.tp-loading{text-align:center;padding:36px 0;color:#404060;font-size:13px;}
.tp-loading p{margin-top:11px;}
.tp-prev{background:#06061a;border:1px solid #11112a;border-radius:8px;padding:11px;max-height:240px;overflow-y:auto;font-size:10px;color:#505070;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;}

/* Import */
.tp-imp-eg{background:#06061a;border:1px solid #11112a;border-radius:8px;padding:10px;font-size:10px;color:#383858;font-family:monospace;white-space:pre-wrap;margin-bottom:11px;max-height:130px;overflow-y:auto;}
.tp-err{font-size:12px;color:#f87171;margin-top:5px;}

/* Category */
.tp-cat-item{display:flex;align-items:center;gap:8px;background:#07071a;border:1px solid #11112a;border-radius:8px;padding:8px 10px;margin-bottom:5px;}
.tp-cat-nm{font-size:13px;font-weight:500;color:#9090b8;flex:1;}
.tp-cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.tp-color-in{width:30px;height:26px;border-radius:5px;border:none;cursor:pointer;padding:0;background:none;}

/* Auth */
.tp-auth-tabs{display:flex;gap:4px;margin-bottom:16px;}
.tp-auth-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #14143a;background:transparent;color:#484868;font-family:'DM Sans',sans-serif;transition:all .15s;}
.tp-auth-tab:hover{background:#11112a;color:#b8b8d8;}
.tp-auth-tab.active{background:#b4f13a18;border-color:#b4f13a40;color:#b4f13a;}
.tp-user-name{font-size:11px;font-weight:600;color:#606080;white-space:nowrap;}
`

export default CSS
