export const QR_BUCKET = "qr-codes";

// Public URL for a QR image path. Works on client + server (NEXT_PUBLIC_ inlined).
export function qrPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${QR_BUCKET}/${path}`;
}
