"use client"

import { useCallback, useRef, useState } from "react"
import { getLiveToken } from "@/lib/actions/live"

function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="13" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  )
}

function StopIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  )
}

export function LiveTranscriber() {
  const [isRecording, setIsRecording] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const wsRef      = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef  = useRef<MediaStream | null>(null)

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
    setHasStarted(true)

    const creds = await getLiveToken()
    if (!creds) { setError("Not authenticated"); return }

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

    ws.onmessage = (e) => setTranscript((prev) => prev ? prev + " " + e.data : e.data)
    ws.onclose   = () => setIsRecording(false)

    try {
      await new Promise<void>((resolve, reject) => {
        ws.onopen  = () => resolve()
        ws.onerror = () => reject()
      })
    } catch {
      setError("Could not connect to transcription server")
      stream.getTracks().forEach((t) => t.stop())
      setHasStarted(false)
      return
    }

    ws.onerror = () => { setError("Connection lost"); stop() }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg;codecs=opus"
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data)
    }

    recorder.start(3000)
    setIsRecording(true)
  }, [stop])

  return (
    <div className="flex flex-col items-center w-full">

      {/* Transcript area — zero height until recording starts, grows down */}
      <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${
        hasStarted ? "max-h-[600px] opacity-100 mb-8" : "max-h-0 opacity-0 mb-0"
      }`}>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 min-h-40 shadow-sm">
          {transcript ? (
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base">{transcript}</p>
          ) : (
            <p className="text-slate-400 text-sm">{isRecording ? "Listening…" : "Your transcript will appear here"}</p>
          )}
        </div>

        {transcript && !isRecording && (
          <button
            onClick={() => setTranscript("")}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Button — large and centered when idle, small when active */}
      <div className={`transition-all duration-500 ease-in-out flex flex-col items-center gap-3 ${
        hasStarted ? "" : "mt-[15vh]"
      }`}>
        <button
          onClick={isRecording ? stop : start}
          className={`rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ease-in-out ${
            isRecording
              ? "w-16 h-16 bg-red-500 hover:bg-red-400 text-white"
              : "w-28 h-28 bg-indigo-600 hover:bg-indigo-500 text-white"
          }`}
        >
          {isRecording
            ? <StopIcon size={22} />
            : <MicIcon size={40} />
          }
        </button>

        <span className={`text-sm transition-all duration-500 ${
          isRecording ? "text-red-400" : "text-slate-400"
        }`}>
          {isRecording
            ? <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />Recording</span>
            : "Tap to transcribe"
          }
        </span>
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
    </div>
  )
}
