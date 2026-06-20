"use client"

import { useRef, useState, useTransition } from "react"
import { grantUploadMinutes } from "@/lib/actions/admin"

export function GrantMinutesForm({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const minutes = Number(inputRef.current?.value)
    setError(null)
    startTransition(async () => {
      try {
        await grantUploadMinutes(userId, minutes)
        if (inputRef.current) inputRef.current.value = ""
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to grant minutes")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        min={1}
        step={1}
        placeholder="min"
        disabled={pending}
        title={error ?? undefined}
        className={`w-16 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
          error ? "border-red-300" : "border-slate-200"
        }`}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition-colors disabled:opacity-50"
      >
        {pending ? "…" : "Add"}
      </button>
    </form>
  )
}
