import { notFound } from "next/navigation"
import Link from "next/link"
import { getTranscription } from "@/lib/actions/transcription"
import { DeleteButton } from "@/components/DeleteButton"
import TranscriptPlayer from "@/components/TranscriptPlayer"

type Segment = { speaker: string; start_time: number; end_time: number; text: string }

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 10)
  return `${m}:${String(s).padStart(2, "0")}.${ms}`
}

const SPEAKER_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
  "bg-sky-500",    "bg-emerald-500", "bg-amber-500",
]

export default async function TranscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const transcription = await getTranscription(id)
  if (!transcription) notFound()

  const segments = (transcription.segments as Segment[]) ?? []
  const speakers = [...new Set(segments.map(s => s.speaker))]
  const speakerColor = Object.fromEntries(
    speakers.map((sp, i) => [sp, SPEAKER_COLORS[i % SPEAKER_COLORS.length]])
  )

  const durationS = transcription.durationMs ? transcription.durationMs / 1000 : null

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-600 font-medium mb-2 inline-block">
            ← Library
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{transcription.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              transcription.sourceType === "video" ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"
            }`}>
              {transcription.sourceType}
            </span>
            {durationS && (
              <span className="text-xs text-slate-400">{formatTime(durationS)}</span>
            )}
            <span className="text-xs text-slate-400">
              {new Date(transcription.createdAt).toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </div>
        </div>
        <DeleteButton id={transcription.id} />
      </div>

      {/* Speaker legend */}
      {speakers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {speakers.map(sp => (
            <div key={sp} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${speakerColor[sp]}`} />
              <span className="text-xs font-medium text-slate-600">{sp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Video + clickable transcript */}
      <TranscriptPlayer
        segments={segments}
        speakerColor={speakerColor}
        sourceKey={transcription.sourceType === "video" ? transcription.sourceKey : null}
      />
    </div>
  )
}
