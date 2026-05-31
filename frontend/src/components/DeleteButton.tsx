"use client"

import { useTransition } from "react"
import { deleteTranscription } from "@/lib/actions/transcription"

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm("Delete this transcription and its media? This cannot be undone.")) return
    startTransition(() => deleteTranscription(id))
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  )
}
