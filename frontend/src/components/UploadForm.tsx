"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"
import { saveTranscription } from "@/lib/actions/transcription"

type Stage =
  | "idle"
  | "converting"
  | "uploading-audio"
  | "transcribing"
  | "uploading-video"
  | "saving"
  | "done"
  | "error"

const STAGE_LABEL: Record<Stage, string> = {
  idle:            "",
  converting:      "Converting video to audio…",
  "uploading-audio": "Uploading audio for transcription…",
  transcribing:    "Transcribing and detecting speakers…",
  "uploading-video": "Uploading original video to storage…",
  saving:          "Saving to your library…",
  done:            "Done!",
  error:           "Something went wrong.",
}

const VIDEO_TYPES = ["video/mp4", "video/mkv", "video/avi", "video/mov", "video/webm"]

export default function UploadForm() {
  const [stage, setStage]   = useState<Stage>("idle")
  const [error, setError]   = useState<string | null>(null)
  const [title, setTitle]   = useState("")
  const ffmpegRef           = useRef<FFmpeg | null>(null)
  const router              = useRouter()

  async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current
    const ff = new FFmpeg()
    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`,   "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    })
    ffmpegRef.current = ff
    return ff
  }

  async function convertToMp3(file: File): Promise<File> {
    const ff = await getFFmpeg()
    await ff.writeFile("input", await fetchFile(file))
    await ff.exec(["-i", "input", "-vn", "-ar", "16000", "-ac", "1", "-b:a", "128k", "output.mp3"])
    const data = await ff.readFile("output.mp3") as Uint8Array
    const blob = new Blob([data.buffer as ArrayBuffer], { type: "audio/mp3" })
    return new File([blob], file.name.replace(/\.[^.]+$/, ".mp3"), { type: "audio/mp3" })
  }

  async function uploadToR2(file: File): Promise<string | undefined> {
    try {
      const res = await fetch(
        `/api/storage/presigned-upload?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`,
      )
      const { url, key } = await res.json()
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
      return key as string
    } catch {
      return undefined
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form     = e.currentTarget
    const input    = form.querySelector<HTMLInputElement>("#file-input")
    const file     = input?.files?.[0]
    if (!file) return

    setError(null)
    const isVideo      = VIDEO_TYPES.includes(file.type) || file.name.match(/\.(mp4|mkv|avi|mov|webm)$/i) !== null
    const fileTitle    = title || file.name.replace(/\.[^.]+$/, "")

    try {
      // 1. Convert video → mp3 client-side if needed
      let audioFile = file
      if (isVideo) {
        setStage("converting")
        audioFile = await convertToMp3(file)
      }

      // 2. Send audio through Next.js proxy → FastAPI (keys stay server-side)
      setStage("uploading-audio")
      const formData = new FormData()
      formData.append("file", audioFile)

      setStage("transcribing")
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? "Transcription failed")
      }
      const { segments, metadata } = await res.json()

      // 3. Upload original video to R2 (best-effort, non-blocking failure)
      let sourceKey: string | undefined
      if (isVideo) {
        setStage("uploading-video")
        sourceKey = await uploadToR2(file)
      }

      // 4. Save to DB
      setStage("saving")
      const saved = await saveTranscription({
        title:      fileTitle,
        sourceType: isVideo ? "video" : "audio",
        sourceKey,
        durationMs: metadata?.duration_ms,
        segments,
      })

      setStage("done")
      router.push(`/dashboard/transcriptions/${saved.id}`)

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setStage("error")
    }
  }

  const busy = !["idle", "done", "error"].includes(stage)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-slate-700">
          Title <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Cell Biology Lecture 4"
          disabled={busy}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="file-input" className="text-sm font-medium text-slate-700">
          File
        </label>
        <label
          htmlFor="file-input"
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
            busy
              ? "border-slate-100 bg-slate-50 pointer-events-none"
              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-indigo-500" stroke="currentColor" strokeWidth={1.5}>
              <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">Click to upload</p>
            <p className="text-xs text-slate-400 mt-0.5">MP3, WAV, M4A, MP4, MOV, MKV — up to 50 MB</p>
          </div>
          <input
            id="file-input"
            type="file"
            accept="audio/*,video/mp4,video/quicktime,video/x-matroska,video/avi,video/webm"
            disabled={busy}
            className="sr-only"
          />
        </label>
      </div>

      {/* Progress */}
      {busy && (
        <div className="flex items-center gap-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
          <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin shrink-0" />
          <p className="text-sm text-indigo-700 font-medium">{STAGE_LABEL[stage]}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors shadow-sm"
      >
        {busy ? "Processing…" : "Transcribe"}
      </button>
    </form>
  )
}
