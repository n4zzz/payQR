import jsQR from "jsqr";

declare global {
  interface BarcodeDetector {
    detect(source: HTMLImageElement | HTMLCanvasElement | ImageBitmap): Promise<
      Array<{
        cornerPoints?: { x: number; y: number }[];
        boundingBox?: { x: number; y: number; width: number; height: number };
      }>
    >;
  }
  interface BarcodeDetectorConstructor {
    new (options?: { formats?: string[] }): BarcodeDetector;
  }
  var BarcodeDetector: BarcodeDetectorConstructor | undefined;
}

const DETECT_MAX = 1000; // downscale long edge for fast detection
const OUTPUT_SIZE = 600; // normalized square output
const QUIET_ZONE = 0.12; // extra white border around the QR, as a fraction of its size

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function readCode(data: ImageData, width: number, height: number) {
  return jsQR(data.data, width, height, { inversionAttempts: "attemptBoth" });
}

interface QrLocation {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
  bottomRightCorner: { x: number; y: number };
  bottomLeftCorner: { x: number; y: number };
}

async function detectWithBarcodeDetector(img: HTMLImageElement | HTMLCanvasElement): Promise<QrLocation | null> {
  if (typeof BarcodeDetector === "undefined") return null;
  try {
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const codes = await detector.detect(img);
    if (!codes || codes.length === 0) return null;
    const c = codes[0];
    if (!c.cornerPoints || c.cornerPoints.length < 4) return null;
    const [tl, tr, br, bl] = c.cornerPoints;
    return {
      topLeftCorner: { x: tl.x, y: tl.y },
      topRightCorner: { x: tr.x, y: tr.y },
      bottomRightCorner: { x: br.x, y: br.y },
      bottomLeftCorner: { x: bl.x, y: bl.y },
    };
  } catch {
    return null;
  }
}

function toGrayscale(data: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.width * data.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    // Luminance
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

function makeBinary(data: ImageData, threshold: number, invert: boolean): ImageData {
  const gray = toGrayscale(data);
  const out = new ImageData(data.width, data.height);
  for (let i = 0; i < gray.length; i++) {
    const on = gray[i] < threshold;
    const v = invert ? !on : on;
    const c = v ? 0 : 255;
    out.data[i * 4] = c;
    out.data[i * 4 + 1] = c;
    out.data[i * 4 + 2] = c;
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

function makeBinaryChannel(data: ImageData, channel: 0 | 1 | 2, threshold: number, invert: boolean): ImageData {
  const out = new ImageData(data.width, data.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const on = data.data[i + channel] < threshold;
    const v = invert ? !on : on;
    const c = v ? 0 : 255;
    out.data[i] = c;
    out.data[i + 1] = c;
    out.data[i + 2] = c;
    out.data[i + 3] = 255;
  }
  return out;
}

function makeBinaryAdaptive(data: ImageData, radius = 10, c = 5): ImageData {
  const gray = toGrayscale(data);
  const w = data.width;
  const h = data.height;
  const out = new ImageData(w, h);
  const integral = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = gray[i];
      integral[i] = v + (x > 0 ? integral[i - 1] : 0) + (y > 0 ? integral[i - w] : 0) - (x > 0 && y > 0 ? integral[i - w - 1] : 0);
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - radius);
      const y1 = Math.max(0, y - radius);
      const x2 = Math.min(w - 1, x + radius);
      const y2 = Math.min(h - 1, y + radius);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);
      const sum =
        integral[y2 * w + x2] -
        (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0) -
        (x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0) +
        (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0);
      const mean = sum / count;
      const i = y * w + x;
      const v = gray[i] < mean - c ? 0 : 255;
      out.data[i * 4] = v;
      out.data[i * 4 + 1] = v;
      out.data[i * 4 + 2] = v;
      out.data[i * 4 + 3] = 255;
    }
  }
  return out;
}

async function tryDetect(data: ImageData, source?: HTMLImageElement | HTMLCanvasElement) {
  // 1) native BarcodeDetector (often handles colored QRs better)
  if (source) {
    const nativeLoc = await detectWithBarcodeDetector(source);
    if (nativeLoc) return { location: nativeLoc };
  }

  // 2) original color image with jsQR
  let code = readCode(data, data.width, data.height);
  if (code) return code;

  // 2) grayscale + binary at multiple thresholds + both polarities
  const thresholds = [48, 64, 80, 96, 112, 128, 144, 160, 176, 192, 208];
  for (const t of thresholds) {
    for (const invert of [false, true]) {
      const bin = makeBinary(data, t, invert);
      code = readCode(bin, bin.width, bin.height);
      if (code) return code;
    }
  }

  // 3) individual color channels (helps with colored QRs like pink/blue)
  for (const channel of [0, 1, 2] as const) {
    for (const t of thresholds) {
      for (const invert of [false, true]) {
        const bin = makeBinaryChannel(data, channel, t, invert);
        code = readCode(bin, bin.width, bin.height);
        if (code) return code;
      }
    }
  }

  // 4) adaptive threshold (Sauvola-like)
  for (const invert of [false, true]) {
    const bin = makeBinaryAdaptive(data, 10, 5);
    if (invert) {
      for (let i = 0; i < bin.data.length; i += 4) {
        const v = bin.data[i] === 0 ? 255 : 0;
        bin.data[i] = v;
        bin.data[i + 1] = v;
        bin.data[i + 2] = v;
      }
    }
    code = readCode(bin, bin.width, bin.height);
    if (code) return code;
  }

  return null;
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
    let code = await tryDetect(data, det);

    // 2) if downscaled detection fails, try at full resolution once
    if (!code && scale < 1) {
      const full = document.createElement("canvas");
      full.width = img.width;
      full.height = img.height;
      const fctx = full.getContext("2d", { willReadFrequently: true });
      if (fctx) {
        fctx.drawImage(img, 0, 0);
        const fullData = fctx.getImageData(0, 0, img.width, img.height);
        code = await tryDetect(fullData, full);
      }
    }
    if (!code) return null;

    // 3) bounding box of the QR corners, mapped back to full resolution
    const c = code.location;
    const xs = [c.topLeftCorner.x, c.topRightCorner.x, c.bottomRightCorner.x, c.bottomLeftCorner.x];
    const ys = [c.topLeftCorner.y, c.topRightCorner.y, c.bottomRightCorner.y, c.bottomLeftCorner.y];
    const minX = Math.min(...xs) / scale;
    const maxX = Math.max(...xs) / scale;
    const minY = Math.min(...ys) / scale;
    const maxY = Math.max(...ys) / scale;

    // 4) square region centred on the QR, padded with a quiet zone
    const size = Math.max(maxX - minX, maxY - minY);
    const half = size / 2 + size * QUIET_ZONE;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const sx = Math.round(cx - half);
    const sy = Math.round(cy - half);
    const s = Math.round(half * 2);

    // 5) draw onto a white square; clip the source to the image so edges that
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
