"use client"

import { useTransition } from "react"
import { setUserActive } from "@/lib/actions/admin"

export function UserToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => setUserActive(userId, !active))}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700"
          : "bg-red-100 text-red-700 hover:bg-emerald-100 hover:text-emerald-700"
      } disabled:opacity-50`}
    >
      {pending ? "…" : active ? "Active" : "Suspended"}
    </button>
  )
}
