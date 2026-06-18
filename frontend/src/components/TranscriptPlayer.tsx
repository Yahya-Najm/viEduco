"use client"

import { useEffect, useRef, useState } from "react"

type Segment = { speaker: string; start_time: number; end_time: number; text: string }

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 10)
  return `${m}:${String(s).padStart(2, "0")}.${ms}`
}

export default function TranscriptPlayer({
  segments,
  speakerColor,
  sourceKey,
}: {
  segments: Segment[]
  speakerColor: Record<string, string>
  sourceKey?: string | null
}) {
  const videoRef              = useRef<HTMLVideoElement>(null)
  const [src, setSrc]         = useState<string | null>(null)
  const [active, setActive]   = useState<number | null>(null)
  const segmentRefs           = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!sourceKey) return
    fetch(`/api/storage/presigned-download?key=${encodeURIComponent(sourceKey)}`)
      .then(r => r.json())
      .then(d => { if (d.url) setSrc(d.url) })
      .catch(() => {})
  }, [sourceKey])

  // Track active segment as video plays
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    function onTimeUpdate() {
      const t = video!.currentTime
      const idx = segments.findIndex(
        (seg, i) =>
          t >= seg.start_time &&
          (i === segments.length - 1 || t < segments[i + 1].start_time)
      )
      if (idx !== -1 && idx !== active) {
        setActive(idx)
        segmentRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
    video.addEventListener("timeupdate", onTimeUpdate)
    return () => video.removeEventListener("timeupdate", onTimeUpdate)
  }, [segments, active])

  function seekTo(time: number, idx: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play()
    }
    setActive(idx)
  }

  return (
    <>
      {/* Video player */}
      {sourceKey && (
        <div className="w-full rounded-xl overflow-hidden bg-black aspect-video">
          {src ? (
            <video ref={videoRef} src={src} controls className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="w-5 h-5 rounded-full border-2 border-slate-500 border-t-slate-200 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Transcript segments */}
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {segments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400 text-center">No segments found.</p>
        ) : (
          segments.map((seg, i) => (
            <div
              key={i}
              ref={el => { segmentRefs.current[i] = el }}
              onClick={() => seekTo(seg.start_time, i)}
              className={`px-5 py-4 flex gap-4 items-start transition-colors ${
                sourceKey ? "cursor-pointer" : ""
              } ${
                active === i
                  ? "bg-indigo-50/70"
                  : "hover:bg-slate-50/60"
              }`}
            >
              {/* Timestamp */}
              <span className={`text-[11px] font-mono pt-0.5 shrink-0 w-14 ${
                active === i ? "text-indigo-500 font-semibold" : "text-slate-400"
              }`}>
                {formatTime(seg.start_time)}
              </span>

              {/* Speaker dot */}
              <div className={`w-5 h-5 rounded-full ${speakerColor[seg.speaker] ?? "bg-slate-300"} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className="text-[8px] font-bold text-white">
                  {seg.speaker.replace("SPEAKER_", "")}
                </span>
              </div>

              {/* Text */}
              <p className={`text-sm leading-relaxed flex-1 ${
                active === i ? "text-slate-900 font-medium" : "text-slate-700"
              }`}>
                {seg.text}
              </p>

              {/* End time */}
              <span className="text-[11px] font-mono text-slate-300 pt-0.5 shrink-0">
                {formatTime(seg.end_time)}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
