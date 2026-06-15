import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { MUTED, TEAL } from "@/lib/tokens";

export default function NotFound() {
  return (
    <PageShell>
      <h1 style={{ fontSize: 24, margin: "8px 0 8px" }}>Not found</h1>
      <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
        That page doesn&apos;t exist.{" "}
        <Link href="/" style={{ color: TEAL }}>
          Go home
        </Link>
        .
      </p>
    </PageShell>
  );
}
