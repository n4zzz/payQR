import Link from "next/link";
import { MUTED } from "@/lib/tokens";

export function BackButton({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        color: MUTED,
        textDecoration: "none",
        marginBottom: 10,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
