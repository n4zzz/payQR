import React, { useState } from "react";

// ============================================================
// PayQR — Apple Wallet–style pay page
// Cards fan up in a stack. Tap one to lift it out and reveal its QR.
// Tap the QR to enlarge for scanning. Tap the lifted card to tuck back.
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
  { id:"tng",  label:"TNG eWallet",   short:"TNG",  idText:"+6012-345 6789",      qrSeed:"tng-amir",  grad:["#2B6BE4","#1640A8"], hint:"DuitNow QR" },
  { id:"mae",  label:"Maybank MAE",   short:"MAE",  idText:"5141 2233 4455",      qrSeed:"mae-amir",  grad:["#F6C544","#E59500"], hint:"DuitNow QR", dark:true },
  { id:"grab", label:"GrabPay",       short:"Grab", idText:"+6012-345 6789",      qrSeed:"grab-amir", grad:["#16C25E","#00913C"], hint:"DuitNow QR" },
  { id:"cimb", label:"Bank transfer", short:"CIMB", idText:"CIMB 7012 3456 7890", qrSeed:"cimb-amir", grad:["#13877A","#0A4A40"], hint:"Account no." },
];

function FauxQR({ seed, size = 150 }) {
  const cells = 23;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rng = () => { h = (h * 1103515245 + 12345) & 0x7fffffff; return h / 0x7fffffff; };
  const g = Array.from({ length: cells }, () => Array.from({ length: cells }, () => rng() > 0.5));
  const stamp = (sr, sc) => { for (let r=0;r<7;r++) for (let c=0;c<7;c++){
    const edge=r===0||r===6||c===0||c===6, core=r>=2&&r<=4&&c>=2&&c<=4; g[sr+r][sc+c]=edge||core; }};
  stamp(0,0); stamp(0,cells-7); stamp(cells-7,0);
  const px = size/cells;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Payment QR code">
      <rect width={size} height={size} fill="#fff"/>
      {g.map((row,r)=>row.map((on,c)=>on?<rect key={`${r}-${c}`} x={c*px} y={r*px} width={px} height={px} fill={INK}/>:null))}
    </svg>
  );
}

const CARD_W = 320;
const CARD_H = 196;
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
        transition:"transform 420ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms",
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

      {/* QR slot appears only when expanded */}
      {expanded && (
        <div style={{ position:"absolute", left:0, right:0, bottom:0, top:58,
          display:"flex", alignItems:"center", gap:16, padding:"0 18px" }}>
          <div onClick={(e)=>{e.stopPropagation(); onQR();}}
            style={{ background:"#fff", padding:8, borderRadius:12, cursor:"zoom-in", flexShrink:0 }}>
            <FauxQR seed={m.qrSeed} size={96}/>
          </div>
          <div>
            <div style={{ fontFamily:mono, fontSize:14, color:txt }}>{m.idText}</div>
            <div style={{ fontSize:11, color:sub, marginTop:6 }}>tap QR to enlarge · tap card to close</div>
          </div>
        </div>
      )}

      {/* footer id when collapsed-but-front (no expansion yet) */}
      {!expanded && (
        <div style={{ position:"absolute", left:18, bottom:16, fontFamily:mono, fontSize:13, color:sub }}>
          {m.idText}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null); // null = stacked view
  const [zoom, setZoom] = useState(null);

  // layout math
  const stackHeight = (METHODS.length - 1) * PEEK + CARD_H + 20;

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
              // lifted to top, expanded
              style = { transform:`translateY(0px) scale(1.02)`, boxShadow:"0 26px 50px -16px rgba(0,0,0,.55)" };
            } else {
              // others tuck down into a tight header strip below
              const order = METHODS.filter(x=>x.id!==selected).findIndex(x=>x.id===m.id);
              style = { transform:`translateY(${CARD_H + 14 + order*HEADER_PEEK}px) scale(.96)`, opacity:.9 };
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
          <div style={{ color:"#fff", fontFamily:mono }}>{zoom.label} · {zoom.idText}</div>
          <div style={{ color:"rgba(255,255,255,.6)", fontSize:13 }}>tap anywhere to close</div>
        </div>
      )}
    </div>
  );
}
