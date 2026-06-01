"use client"

import { useCallback, useRef, useState } from "react"
import { getLiveToken } from "@/lib/actions/live"

export function LiveTranscriber() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    recorderRef.current = null
    wsRef.current = null
    streamRef.current = null
    setIsRecording(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)

    const creds = await getLiveToken()
    if (!creds) {
      setError("Not authenticated")
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError("Microphone access denied")
      return
    }
    streamRef.current = stream

    const ws = new WebSocket(`${creds.wsUrl}?token=${creds.token}`)
    wsRef.current = ws

    ws.onmessage = (e) =>
      setTranscript((prev) => (prev ? prev + " " + e.data : e.data))
    ws.onclose = () => setIsRecording(false)

    try {
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject()
      })
    } catch {
      setError("Could not connect to transcription server")
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    ws.onerror = () => {
      setError("Connection lost")
      stop()
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg;codecs=opus"

    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data)
      }
    }

    recorder.start(3000)
    setIsRecording(true)
  }, [stop])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={isRecording ? stop : start}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
            isRecording
              ? "bg-red-500 hover:bg-red-400 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full bg-white ${isRecording ? "animate-pulse" : ""}`}
          />
          {isRecording ? "Stop recording" : "Start recording"}
        </button>

        {transcript && !isRecording && (
          <button
            onClick={() => setTranscript("")}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="min-h-52 bg-white rounded-xl border border-slate-100 p-5">
        {transcript ? (
          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
            {transcript}
          </p>
        ) : (
          <p className="text-slate-400 text-sm">
            {isRecording ? "Listening…" : "Press start to begin transcribing"}
          </p>
        )}
      </div>
    </div>
  )
}
