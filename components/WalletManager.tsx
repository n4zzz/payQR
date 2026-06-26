"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PROVIDER_THEME, PROVIDERS, themeFor, type Provider } from "@/lib/providers";
import { detectAndCropQr, reencodeToPng } from "@/lib/qrCrop";
import { QR_BUCKET, qrPublicUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { CORAL, INK, MUTED, TEAL, mono } from "@/lib/tokens";
import { fieldLabel, primaryBtn, textInput } from "@/lib/uiStyles";
import { LIMITS, tooLong } from "@/lib/validators";

type ManagedMethod = {
  id: string;
  provider: string;
  label: string;
  hint: string | null;
  qrPath: string;
};

const MAX_BYTES = 5 * 1024 * 1024; // generous — screenshots can be a few MB before cropping
// QR uploads are always re-encoded to PNG before storage so we never trust
// the browser-supplied file.type. This prevents malicious files spoofed as images.
const ACCEPTED = new Set(["image/png", "image/jpeg", "image/webp"]);

export function WalletManager({ userId, initial }: { userId: string; initial: ManagedMethod[] }) {
  const router = useRouter();
  const [methods, setMethods] = useState<ManagedMethod[]>(initial);
  const [provider, setProvider] = useState<Provider>("tng");
  const [label, setLabel] = useState(PROVIDER_THEME.tng.defaultLabel);
  const [hint, setHint] = useState(PROVIDER_THEME.tng.defaultHint);

  const [file, setFile] = useState<File | null>(null);
  const [cropBlob, setCropBlob] = useState<Blob | null>(null);
  const [detected, setDetected] = useState<"yes" | "no" | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [autoCrop, setAutoCrop] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickProvider(p: Provider) {
    setProvider(p);
    setLabel(PROVIDER_THEME[p].defaultLabel);
    setHint(PROVIDER_THEME[p].defaultHint);
  }

  async function onFile(f: File | null) {
    setError(null);
    setFile(f);
    setCropBlob(null);
    setDetected(null);
    if (!f) return;
    setDetecting(true);
    try {
      const blob = await detectAndCropQr(f);
      if (blob) {
        setCropBlob(blob);
        setDetected("yes");
      } else {
        setDetected("no");
      }
    } catch {
      setDetected("no");
    } finally {
      setDetecting(false);
    }
  }

  // Preview reflects exactly what will be uploaded.
  useEffect(() => {
    const blob = autoCrop && cropBlob ? cropBlob : file;
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, cropBlob, autoCrop]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Choose a QR image.");
    if (!label.trim()) return setError("Add a label.");
    const labelErr = tooLong(label.trim(), LIMITS.methodLabel);
    if (labelErr) return setError(labelErr);
    const hintErr = tooLong(hint.trim(), LIMITS.methodHint);
    if (hintErr) return setError(hintErr);

    if (!ACCEPTED.has(file.type)) return setError("Use a PNG, JPG or WEBP image.");

    let blob: Blob;
    try {
      blob = autoCrop && cropBlob ? cropBlob : await reencodeToPng(file);
    } catch {
      return setError("Could not read image. Use a valid PNG, JPG or WEBP.");
    }
    if (blob.size > MAX_BYTES) return setError("Image is too large.");

    setBusy(true);
    const supabase = createClient();
    const id = crypto.randomUUID();
    const path = `${userId}/${id}.png`;

    const { error: upErr } = await supabase.storage
      .from(QR_BUCKET)
      .upload(path, blob, { contentType: "image/png", upsert: false });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { error: insErr } = await supabase.from("payment_methods").insert({
      id,
      profile_id: userId,
      provider,
      label: label.trim(),
      hint: hint.trim() || null,
      qr_image_path: path,
      sort_order: methods.length,
    });
    if (insErr) {
      await supabase.storage.from(QR_BUCKET).remove([path]); // don't orphan the file
      setError(insErr.message);
      setBusy(false);
      return;
    }

    setMethods((m) => [...m, { id, provider, label: label.trim(), hint: hint.trim() || null, qrPath: path }]);
    setFile(null);
    setCropBlob(null);
    setDetected(null);
    setFileKey((k) => k + 1);
    setBusy(false);
    router.refresh();
  }

  async function remove(m: ManagedMethod) {
    if (!confirm(`Remove ${m.label}?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("payment_methods").delete().eq("id", m.id);
    if (error) {
      setError(error.message);
      return;
    }
    await supabase.storage.from(QR_BUCKET).remove([m.qrPath]);
    setMethods((list) => list.filter((x) => x.id !== m.id));
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* current methods */}
      <div>
        {methods.length === 0 ? (
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>No QR codes yet. Add your first below.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {methods.map((m) => {
              const theme = themeFor(m.provider);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "#fff",
                    border: "1px solid #ece6da",
                    borderRadius: 14,
                    padding: 10,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrPublicUrl(m.qrPath)}
                    alt=""
                    width={48}
                    height={48}
                    style={{ borderRadius: 8, objectFit: "cover", background: "#fff", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>{m.hint ?? theme.defaultHint}</div>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      background: `linear-gradient(150deg, ${theme.grad[0]}, ${theme.grad[1]})`,
                      borderRadius: 6,
                      padding: "4px 7px",
                    }}
                  >
                    {theme.short}
                  </span>
                  <button
                    onClick={() => remove(m)}
                    aria-label={`Remove ${m.label}`}
                    style={{ all: "unset", cursor: "pointer", color: MUTED, fontSize: 20, padding: "0 4px" }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* add a method */}
      <form
        onSubmit={add}
        style={{ background: "#FBF9F3", border: "1px solid #ece6da", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontWeight: 600, fontSize: 15, color: INK }}>Add a QR</div>

        <div>
          <div style={fieldLabel}>Provider</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PROVIDERS.map((p) => {
              const on = p === provider;
              const t = PROVIDER_THEME[p];
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => pickProvider(p)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "7px 12px",
                    borderRadius: 999,
                    color: on ? "#fff" : INK,
                    background: on ? `linear-gradient(150deg, ${t.grad[0]}, ${t.grad[1]})` : "#fff",
                    border: on ? "1px solid transparent" : "1px solid #ece6da",
                  }}
                >
                  {t.short}
                </button>
              );
            })}
          </div>
        </div>

        <label style={{ display: "block" }}>
          <div style={fieldLabel}>Label</div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={textInput} placeholder="e.g. TNG eWallet" />
        </label>

        <label style={{ display: "block" }}>
          <div style={fieldLabel}>Hint (optional)</div>
          <input value={hint} onChange={(e) => setHint(e.target.value)} style={textInput} placeholder="DuitNow QR" />
        </label>

        <label style={{ display: "block" }}>
          <div style={fieldLabel}>QR image — screenshot is fine, we crop to the QR</div>
          <input
            key={fileKey}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            style={{ fontSize: 13, color: INK }}
          />
        </label>

        {/* preview / detection feedback */}
        {file && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 12,
                border: "1px solid #ece6da",
                background: "#fff",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {detecting ? (
                <span style={{ fontSize: 11, color: MUTED }}>Scanning…</span>
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="QR preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : null}
            </div>
            <div style={{ minWidth: 0 }}>
              {detecting ? (
                <div style={{ fontSize: 13, color: MUTED }}>Looking for a QR…</div>
              ) : detected === "yes" ? (
                <>
                  <div style={{ fontSize: 13, color: TEAL, fontWeight: 600 }}>✓ QR found & cropped</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, marginTop: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoCrop} onChange={(e) => setAutoCrop(e.target.checked)} />
                    Auto-crop to the QR
                  </label>
                </>
              ) : detected === "no" ? (
                <div style={{ fontSize: 13, color: MUTED }}>
                  No QR detected — we&apos;ll upload the image as-is. Try a clearer screenshot.
                </div>
              ) : null}
            </div>
          </div>
        )}

        {error && <p style={{ color: CORAL, fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={busy || detecting} style={{ ...primaryBtn, opacity: busy || detecting ? 0.6 : 1 }}>
          {busy ? "Uploading…" : "Add to wallet"}
        </button>
      </form>
    </div>
  );
}
