import React, { useState } from "react";

// ============================================================
// PayQR — Apple Wallet–style pay page
// Cards fan up in a stack. Tap one to lift it out and reveal its QR.
// Tap the QR to enlarge for scanning. Tap the lifted card to tuck back.
// Save a QR to upload it from your gallery inside your e-wallet (same-phone flow).
// In-session only, no real payments.
// ============================================================

const PAPER = "#F6F3EC";
const INK = "#1A1A17";
const CORAL = "#E8623C";
const MUTED = "#7A7468";
const TEAL = "#0E6B5C";

const sans = `'Inter', ui-sans-serif, system-ui, sans-serif`;
const mono = `'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace`;

// Each card carries its own gradient identity, the way Wallet cards do.
const METHODS = [
  { id:"tng",  label:"TNG eWallet",   short:"TNG",  qrSeed:"tng-amir",  grad:["#2B6BE4","#1640A8"], hint:"DuitNow QR" },
  { id:"mae",  label:"Maybank MAE",   short:"MAE",  qrSeed:"mae-amir",  grad:["#F6C544","#E59500"], hint:"DuitNow QR", dark:true },
  { id:"grab", label:"GrabPay",       short:"Grab", qrSeed:"grab-amir", grad:["#16C25E","#00913C"], hint:"DuitNow QR" },
  { id:"cimb", label:"Bank transfer", short:"CIMB", qrSeed:"cimb-amir", grad:["#13877A","#0A4A40"], hint:"Account no." },
];

const QR_CELLS = 23;

// Deterministic faux-QR matrix from a seed. (Prototype only — the real app
// displays the actual image the user uploaded.)
function qrMatrix(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rng = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  const g = Array.from({ length: QR_CELLS }, () => Array.from({ length: QR_CELLS }, () => rng() > 0.5));
  const stamp = (sr, sc) => { for (let r=0;r<7;r++) for (let c=0;c<7;c++){
    const edge=r===0||r===6||c===0||c===6, core=r>=2&&r<=4&&c>=2&&c<=4; g[sr+r][sc+c]=edge||core; }};
  stamp(0,0); stamp(0,QR_CELLS-7); stamp(QR_CELLS-7,0);
  return g;
}

function FauxQR({ seed, size = 150 }) {
  const g = qrMatrix(seed);
  const px = size/QR_CELLS;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Payment QR code">
      <rect width={size} height={size} fill="#fff"/>
      {g.map((row,r)=>row.map((on,c)=>on?<rect key={`${r}-${c}`} x={c*px} y={r*px} width={px} height={px} fill={INK}/>:null))}
    </svg>
  );
}

// Rasterize the QR (with a label footer) to a PNG and trigger a download, so the
// payer can save it and upload it from their gallery inside their e-wallet app.
// In the real app this just downloads the uploaded image file instead.
function downloadQR(m) {
  const S = 512, pad = 44, footer = 70;
  const g = qrMatrix(m.qrSeed);
  const px = S / QR_CELLS;
  let rects = "";
  g.forEach((row, r) => row.forEach((on, c) => {
    if (on) rects += `<rect x="${c*px}" y="${r*px}" width="${px}" height="${px}" fill="${INK}"/>`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#fff"/>${rects}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = S + pad * 2;
    canvas.height = S + pad * 2 + footer;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad, S, S);
    ctx.textAlign = "center";
    ctx.fillStyle = INK; ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText(m.label, canvas.width / 2, S + pad + 46);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `payqr-${m.id}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  img.src = url;
}

const CARD_W = 320;
const CARD_H = 196;
const EXPANDED_H = 300; // height a card grows to when lifted, to showcase the QR
const PEEK = 62;        // how much of each tucked card shows
const HEADER_PEEK = 46; // visible strip of non-selected cards when one is open

function Card({ m, style, onClick, expanded, onQR, z }) {
  const txt = m.dark ? "#1A1A17" : "#fff";
  const sub = m.dark ? "rgba(26,26,23,.7)" : "rgba(255,255,255,.8)";
  return (
    <div onClick={onClick}
      style={{
        position:"absolute", left:"50%", width:CARD_W, height:CARD_H,
        marginLeft:-CARD_W/2, borderRadius:20, cursor:"pointer", zIndex:z,
        background:`linear-gradient(150deg, ${m.grad[0]} 0%, ${m.grad[1]} 100%)`,
        color:txt, boxShadow:"0 12px 30px -12px rgba(0,0,0,.5)",
        transition:"transform 420ms cubic-bezier(.2,.8,.2,1), height 420ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms",
        padding:18, boxSizing:"border-box", overflow:"hidden", ...style,
      }}>
      {/* subtle sheen */}
      <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%",
        background:"rgba(255,255,255,.12)" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
        <div>
          <div style={{ fontWeight:600, fontSize:17 }}>{m.label}</div>
          <div style={{ fontSize:12, color:sub, marginTop:2 }}>{m.hint}</div>
        </div>
        <div style={{ width:38, height:26, borderRadius:6, background:"rgba(255,255,255,.25)",
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:txt }}>
          {m.short}
        </div>
      </div>

      {/* expanded: QR centered, Save button directly beneath it */}
      {expanded && (
        <div style={{ position:"absolute", left:0, right:0, top:56, bottom:16,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14 }}>
          <div onClick={(e)=>{e.stopPropagation(); onQR();}}
            style={{ background:"#fff", padding:10, borderRadius:14, cursor:"zoom-in", lineHeight:0,
              boxShadow:"0 8px 20px -10px rgba(0,0,0,.5)" }}>
            <FauxQR seed={m.qrSeed} size={150}/>
          </div>
          <button onClick={(e)=>{ e.stopPropagation(); downloadQR(m); }}
            style={{ all:"unset", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6,
              padding:"9px 20px", borderRadius:999, background:"rgba(255,255,255,.22)", color:txt, fontSize:13, fontWeight:600 }}>
            ↓ Save QR
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null); // null = stacked view
  const [zoom, setZoom] = useState(null);

  // layout math — the stack is taller while a card is lifted
  const stackHeight = selected === null
    ? (METHODS.length - 1) * PEEK + CARD_H + 20
    : EXPANDED_H + 14 + (METHODS.length - 2) * HEADER_PEEK + CARD_H + 20;

  return (
    <div style={{ fontFamily:sans, background:PAPER, minHeight:"100vh", color:INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap');
        @media (prefers-reduced-motion: reduce){ *{transition:none!important} }
        button:focus-visible,[role=button]:focus-visible{ outline:2px solid ${TEAL}; outline-offset:2px; }
      `}</style>

      <div style={{ maxWidth:440, margin:"0 auto", padding:"26px 18px 60px" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:4 }}>
          <span style={{ fontFamily:mono, color:CORAL, fontSize:13 }}>★</span>
          <h2 style={{ margin:0, fontSize:24, letterSpacing:"-0.02em" }}>Pay Amir</h2>
        </div>
        <p style={{ color:MUTED, fontSize:14, margin:"4px 0 22px 26px", lineHeight:1.5 }}>
          {selected ? "Tap the card to tuck it back." : "Tap a card to lift it and show its QR."}
        </p>

        {/* the stack */}
        <div style={{ position:"relative", height:stackHeight, transition:"height 420ms" }}>
          {METHODS.map((m,i)=>{
            const isSel = selected===m.id;
            let style;
            if (selected===null) {
              // fanned stack
              style = { transform:`translateY(${i*PEEK}px)` };
            } else if (isSel) {
              // lifted to the top and grown tall to showcase the QR
              style = { transform:`translateY(0px)`, height:EXPANDED_H, boxShadow:"0 26px 50px -16px rgba(0,0,0,.55)" };
            } else {
              // others tuck down into a tight header strip below the expanded card
              const order = METHODS.filter(x=>x.id!==selected).findIndex(x=>x.id===m.id);
              style = { transform:`translateY(${EXPANDED_H + 14 + order*HEADER_PEEK}px) scale(.96)`, opacity:.9 };
            }
            const z = isSel ? 100 : (selected===null ? i : 10+i);
            return (
              <Card key={m.id} m={m} style={style} z={z}
                expanded={isSel}
                onClick={()=> setSelected(isSel ? null : m.id)}
                onQR={()=> setZoom(m)} />
            );
          })}
        </div>

        {selected && (
          <button onClick={()=>setSelected(null)}
            style={{ all:"unset", cursor:"pointer", display:"block", margin:"18px auto 0",
              padding:"10px 20px", borderRadius:999, background:"#fff", border:"1px solid #ece6da",
              fontSize:14, fontWeight:600, color:INK }}>
            Back to all cards
          </button>
        )}

        <p style={{ fontSize:11, color:MUTED, marginTop:26, lineHeight:1.6, textAlign:"center" }}>
          PayQR only shows QR images Amir uploaded — it never holds or moves money.
          Check the name in your banking app before paying.
        </p>
      </div>

      {/* fullscreen zoom for scanning */}
      {zoom && (
        <div onClick={()=>setZoom(null)}
          style={{ position:"fixed", inset:0, background:"rgba(10,12,11,.88)", zIndex:200,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18 }}>
          <div style={{ background:"#fff", padding:22, borderRadius:24 }}>
            <FauxQR seed={zoom.qrSeed} size={260}/>
          </div>
          <div style={{ color:"#fff", fontFamily:mono }}>{zoom.label}</div>
          <button onClick={(e)=>{ e.stopPropagation(); downloadQR(zoom); }}
            style={{ all:"unset", cursor:"pointer", padding:"12px 26px", borderRadius:999,
              background:"#fff", color:INK, fontWeight:600, fontSize:15 }}>
            ↓ Save QR to photos
          </button>
          <div style={{ color:"rgba(255,255,255,.65)", fontSize:13, textAlign:"center", lineHeight:1.6, maxWidth:300 }}>
            Paying from this phone? Save it, then in your e-wallet tap <b>Scan → Upload from gallery</b>.
            <br/>Tap anywhere to close.
          </div>
        </div>
      )}
    </div>
  );
}
