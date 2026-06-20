"use client"

type LimitReason = "exhausted" | "exceeds"

const CONTACT_EMAIL = "yahyasafdari0@gmail.com"

const COPY: Record<LimitReason, { title: string; body: string }> = {
  exceeds: {
    title: "This file exceeds your remaining upload time",
    body: "Your upload is longer than the time you have left. Try a shorter file, or split it into smaller pieces.",
  },
  exhausted: {
    title: "Your upload time is finished",
    body: `You've used all of your available upload time and can't upload any more video or audio. Contact ${CONTACT_EMAIL} to request more time.`,
  },
}

export default function LimitModal({
  reason,
  onClose,
}: {
  reason: LimitReason
  onClose: () => void
}) {
  const { title, body } = COPY[reason]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{body}</p>

        <div className="mt-6 flex justify-end gap-3">
          {reason === "exhausted" && (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Requesting more upload time`}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Email {CONTACT_EMAIL}
            </a>
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
