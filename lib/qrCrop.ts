import jsQR from "jsqr";

const DETECT_MAX = 1000; // downscale long edge for fast detection
const OUTPUT_SIZE = 600; // normalized square output
const QUIET_ZONE = 0.12; // extra white border around the QR, as a fraction of its size

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

// Detect a QR in the image and return a cropped, square PNG (QR + white quiet
// zone), normalized to OUTPUT_SIZE. Returns null if no QR is found.
export async function detectAndCropQr(file: File): Promise<Blob | null> {
  const img = await loadImage(file);
  try {
    // 1) detect on a downscaled copy for speed
    const scale = Math.min(1, DETECT_MAX / Math.max(img.width, img.height));
    const dw = Math.max(1, Math.round(img.width * scale));
    const dh = Math.max(1, Math.round(img.height * scale));
    const det = document.createElement("canvas");
    det.width = dw;
    det.height = dh;
    const dctx = det.getContext("2d", { willReadFrequently: true });
    if (!dctx) return null;
    dctx.drawImage(img, 0, 0, dw, dh);
    const data = dctx.getImageData(0, 0, dw, dh);
    const code = jsQR(data.data, dw, dh, { inversionAttempts: "attemptBoth" });
    if (!code) return null;

    // 2) bounding box of the QR corners, mapped back to full resolution
    const c = code.location;
    const xs = [c.topLeftCorner.x, c.topRightCorner.x, c.bottomRightCorner.x, c.bottomLeftCorner.x];
    const ys = [c.topLeftCorner.y, c.topRightCorner.y, c.bottomRightCorner.y, c.bottomLeftCorner.y];
    const minX = Math.min(...xs) / scale;
    const maxX = Math.max(...xs) / scale;
    const minY = Math.min(...ys) / scale;
    const maxY = Math.max(...ys) / scale;

    // 3) square region centred on the QR, padded with a quiet zone
    const size = Math.max(maxX - minX, maxY - minY);
    const half = size / 2 + size * QUIET_ZONE;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = Math.round(cx - half);
    const sy = Math.round(cy - half);
    const s = Math.round(half * 2);

    // 4) draw onto a white square; clip the source to the image so edges that
    //    fall outside simply stay white (no stretching, no cut QR)
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const octx = out.getContext("2d");
    if (!octx) return null;
    octx.fillStyle = "#fff";
    octx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const cropX = Math.max(0, sx);
    const cropY = Math.max(0, sy);
    const cropR = Math.min(img.width, sx + s);
    const cropB = Math.min(img.height, sy + s);
    const cropW = cropR - cropX;
    const cropH = cropB - cropY;
    if (cropW <= 0 || cropH <= 0) return null;

    const k = OUTPUT_SIZE / s;
    octx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      (cropX - sx) * k,
      (cropY - sy) * k,
      cropW * k,
      cropH * k
    );

    return await new Promise<Blob | null>((resolve) => out.toBlob((b) => resolve(b), "image/png"));
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

// Re-encode any image file to PNG via canvas. This normalizes the content type
// so we never trust the browser-supplied file.type for storage.
export async function reencodeToPng(file: File, maxLongEdge = 1200): Promise<Blob> {
  const img = await loadImage(file);
  try {
    const scale = Math.min(1, maxLongEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas context");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
    if (!blob) throw new Error("Could not encode image to PNG");
    return blob;
  } finally {
    if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}
