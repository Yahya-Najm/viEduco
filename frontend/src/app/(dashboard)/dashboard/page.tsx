import Link from "next/link"
import { getTranscriptions } from "@/lib/actions/transcription"
import { DeleteButton } from "@/components/DeleteButton"

export const metadata = { title: "Library — viEduco" }

function formatDuration(ms?: number | null) {
  if (!ms) return null
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export default async function DashboardPage() {
  const transcriptions = await getTranscriptions()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your library</h1>
          <p className="text-sm text-slate-500 mt-1">{transcriptions.length} transcription{transcriptions.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          + New upload
        </Link>
      </div>

      {transcriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-indigo-400" stroke="currentColor" strokeWidth={1.5}>
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-700">No transcriptions yet</p>
            <p className="text-sm text-slate-400 mt-1">Upload a video or audio file to get started</p>
          </div>
          <Link href="/dashboard/upload" className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors">
            Upload your first file
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {transcriptions.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-100 flex items-center hover:border-indigo-200 hover:shadow-sm transition-all group"
            >
              <Link
                href={`/dashboard/transcriptions/${t.id}`}
                className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  t.sourceType === "video" ? "bg-violet-100" : "bg-indigo-100"
                }`}>
                  {t.sourceType === "video" ? (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-violet-600" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-indigo-600" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{t.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {t.durationMs && (
                      <span className="text-xs text-slate-400">{formatDuration(t.durationMs)}</span>
                    )}
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                      t.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>{t.status}</span>
                  </div>
                </div>

                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>

              <div className="pr-3">
                <DeleteButton id={t.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
