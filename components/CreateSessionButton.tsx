import Link from "next/link";
import { TEAL } from "@/lib/tokens";

// Owner control — fixed at the bottom of the wallet view.
export function CreateSessionButton({ href = "/dashboard/sessions/new" }: { href?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        textAlign: "center",
        textDecoration: "none",
        padding: "14px 16px",
        borderRadius: 14,
        background: TEAL,
        color: "#fff",
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      + Create a split session
    </Link>
  );
}
