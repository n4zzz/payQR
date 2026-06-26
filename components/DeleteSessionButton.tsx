"use client";

import { useTransition } from "react";
import { deleteSession } from "@/app/dashboard/sessions/actions";
import { CORAL } from "@/lib/tokens";

export function DeleteSessionButton({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Delete this session? This can't be undone.")) {
          startTransition(() => deleteSession(slug));
        }
      }}
      disabled={pending}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "block",
        margin: "24px auto 0",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 600,
        color: CORAL,
        opacity: pending ? 0.6 : 1,
      }}
    >
      {pending ? "Deleting…" : "Delete session"}
    </button>
  );
}
