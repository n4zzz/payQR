import { INK } from "./tokens";

export const QR_CELLS = 23;

// Deterministic faux-QR matrix from a seed. (Prototype/demo only — real wallets
// display the actual image the user uploaded.)
export function qrMatrix(seed: string): boolean[][] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rng = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  const g = Array.from({ length: QR_CELLS }, () =>
    Array.from({ length: QR_CELLS }, () => rng() > 0.5)
  );
  const stamp = (sr: number, sc: number) => {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        g[sr + r][sc + c] = edge || core;
      }
  };
  stamp(0, 0);
  stamp(0, QR_CELLS - 7);
  stamp(QR_CELLS - 7, 0);
  return g;
}

export function FauxQR({ seed, size = 150 }: { seed: string; size?: number }) {
  const g = qrMatrix(seed);
  const px = size / QR_CELLS;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Payment QR code"
      style={{ display: "block" }}
    >
      <rect width={size} height={size} fill="#fff" />
      {g.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect key={`${r}-${c}`} x={c * px} y={r * px} width={px} height={px} fill={INK} />
          ) : null
        )
      )}
    </svg>
  );
}

function triggerDownload(href: string, filename: string, revoke = false) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// Save a QR so the payer can upload it from their gallery inside their e-wallet.
// Real wallets download the uploaded image; demo wallets rasterize the faux QR.
export async function downloadQR(opts: {
  label: string;
  filename: string;
  seed?: string;
  url?: string;
}) {
  const { label, filename, seed, url } = opts;

  if (url) {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      triggerDownload(URL.createObjectURL(blob), filename, true);
    } catch {
      triggerDownload(url, filename); // fallback: let the browser handle it
    }
    return;
  }

  if (!seed) return;
  const S = 512;
  const pad = 44;
  const footer = 70;
  const g = qrMatrix(seed);
  const px = S / QR_CELLS;
  let rects = "";
  g.forEach((row, r) =>
    row.forEach((on, c) => {
      if (on) rects += `<rect x="${c * px}" y="${r * px}" width="${px}" height="${px}" fill="${INK}"/>`;
    })
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="#fff"/>${rects}</svg>`;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = S + pad * 2;
    canvas.height = S + pad * 2 + footer;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad, S, S);
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = "600 30px Inter, system-ui, sans-serif";
    ctx.fillText(label, canvas.width / 2, S + pad + 46);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(URL.createObjectURL(blob), filename, true);
    }, "image/png");
  };
  img.src = svgUrl;
}
