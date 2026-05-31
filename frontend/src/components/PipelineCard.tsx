"use client"

import { useState, useEffect } from "react"

type Stage = "upload" | "go" | "transcript" | "timeline" | "exercises" | "interactive"

const STAGES: Stage[] = ["upload", "go", "transcript", "timeline", "exercises", "interactive"]

const DURATIONS: Record<Stage, number> = {
  upload:      3400,
  go:          3000,
  transcript:  4200,
  timeline:    4000,
  exercises:   4200,
  interactive: 4000,
}

const LABELS: Record<Stage, string> = {
  upload:      "01 · Upload",
  go:          "02 · Analyze",
  transcript:  "03 · Transcribe",
  timeline:    "04 · Detect moments",
  exercises:   "05 · Generate exercises",
  interactive: "06 · Explore",
}

export default function PipelineCard() {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const stage = STAGES[idx]

  useEffect(() => {
    const fadeOut = setTimeout(() => setFading(true), DURATIONS[stage] - 400)
    const advance = setTimeout(() => {
      setIdx(i => (i + 1) % STAGES.length)
      setFading(false)
    }, DURATIONS[stage])
    return () => { clearTimeout(fadeOut); clearTimeout(advance) }
  }, [idx, stage])

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/60" />
          <span className="text-sm font-semibold text-white">Cell Biology — Lecture 4</span>
        </div>
        <span className="text-xs text-white/70 font-medium">24:18</span>
      </div>

      {/* Stage progress bar + label */}
      <div className="px-4 pt-3 pb-1.5 flex flex-col gap-1.5">
        <div className="flex gap-1">
          {STAGES.map((s, i) => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors duration-500 ${
                i === idx ? "bg-indigo-500" : i < idx ? "bg-indigo-200" : "bg-slate-100"
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
          {LABELS[stage]}
        </span>
      </div>

      {/* Stage body — keyed so CSS animations restart on each stage */}
      <div
        key={idx}
        className="px-4 pb-5 pt-2 min-h-[230px]"
        style={{ opacity: fading ? 0 : 1, transition: "opacity 0.35s ease" }}
      >
        {stage === "upload"      && <UploadStage />}
        {stage === "go"          && <GoStage />}
        {stage === "transcript"  && <TranscriptStage />}
        {stage === "timeline"    && <TimelineStage />}
        {stage === "exercises"   && <ExercisesStage />}
        {stage === "interactive" && <InteractiveStage />}
      </div>
    </div>
  )
}

// ── Stage: Upload ────────────────────────────────────────────────────────────

function UploadStage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4">
      <div
        className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-dashed border-indigo-200 flex items-center justify-center animate-fade-up"
        style={{ opacity: 0, animationDelay: "0.1s" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-indigo-500" stroke="currentColor" strokeWidth={1.5}>
          <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="text-center animate-fade-up" style={{ opacity: 0, animationDelay: "0.25s" }}>
        <p className="text-xs font-bold text-slate-800">lecture_biology_ch4.mp4</p>
        <p className="text-[11px] text-slate-400 mt-0.5">142 MB · MP4</p>
      </div>

      <div className="w-full animate-fade-up" style={{ opacity: 0, animationDelay: "0.4s" }}>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-slate-400">Uploading…</span>
          <span className="text-[10px] font-semibold text-indigo-600">100%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-progress-fill" />
        </div>
      </div>
    </div>
  )
}

// ── Stage: Go ────────────────────────────────────────────────────────────────

function GoStage() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-5">
      <p
        className="text-xs text-slate-500 text-center animate-fade-up"
        style={{ opacity: 0, animationDelay: "0.15s" }}
      >
        Video ready · Start the AI pipeline?
      </p>

      <div className="animate-fade-up relative" style={{ opacity: 0, animationDelay: "0.35s" }}>
        <div className="absolute inset-0 rounded-xl bg-indigo-400/25 animate-ping" style={{ animationDuration: "1.4s" }} />
        <button className="relative px-9 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200/80 cursor-default animate-cursor-click">
          Analyze ✦
        </button>
      </div>

      <div
        className="flex items-center gap-2 text-[11px] text-slate-400 animate-fade-up"
        style={{ opacity: 0, animationDelay: "1.8s" }}
      >
        <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin inline-block" />
        Pipeline running…
      </div>
    </div>
  )
}

// ── Stage: Transcript ────────────────────────────────────────────────────────

function TranscriptStage() {
  const lines = [
    { name: "Dr. Kim",  color: "bg-indigo-500",  text: "The mitochondria drives ATP synthesis through oxidative phosphorylation." },
    { name: "Student",  color: "bg-violet-500",  text: "Is that the same process as in the electron transport chain?" },
    { name: "Dr. Kim",  color: "bg-indigo-500",  text: "Exactly — the ETC is a core component of that pathway." },
  ]
  return (
    <div className="flex flex-col gap-3.5">
      {lines.map((l, i) => (
        <div
          key={i}
          className="flex gap-2.5 items-start animate-fade-up"
          style={{ opacity: 0, animationDelay: `${0.15 + i * 0.45}s` }}
        >
          <div className={`w-6 h-6 rounded-full ${l.color} flex items-center justify-center shrink-0 mt-0.5`}>
            <span className="text-[9px] font-bold text-white">{l.name[0]}</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-700 mb-0.5">{l.name}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{l.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stage: Timeline ──────────────────────────────────────────────────────────

function TimelineStage() {
  const markers = [
    { pos: "22%",  time: "02:34", color: "bg-indigo-500",  label: "Concept introduced" },
    { pos: "54%",  time: "08:12", color: "bg-violet-500",  label: "Key process" },
    { pos: "80%",  time: "15:47", color: "bg-fuchsia-500", label: "Summary" },
  ]
  return (
    <div className="flex flex-col gap-3.5 py-1">
      <p
        className="text-[11px] text-slate-500 animate-fade-up"
        style={{ opacity: 0, animationDelay: "0.1s" }}
      >
        Agent scanning for key learning moments…
      </p>

      {/* Bar + markers */}
      <div className="relative animate-fade-up" style={{ opacity: 0, animationDelay: "0.35s" }}>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-200 to-violet-200 rounded-full animate-progress-fill" />
        </div>
        {markers.map((m, i) => (
          <div
            key={i}
            className="absolute -top-1 animate-fade-up"
            style={{ left: m.pos, transform: "translateX(-50%)", opacity: 0, animationDelay: `${0.7 + i * 0.4}s` }}
          >
            <div className={`w-4 h-4 rounded-full ${m.color} border-2 border-white shadow-md`} />
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-2">
        {markers.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-2 animate-fade-up"
            style={{ opacity: 0, animationDelay: `${1.0 + i * 0.4}s` }}
          >
            <span className={`text-[10px] font-bold text-white ${m.color} px-1.5 py-0.5 rounded shrink-0`}>
              {m.time}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400 shrink-0">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stage: Exercises ─────────────────────────────────────────────────────────

function ExercisesStage() {
  const items = [
    { time: "02:34", color: "bg-indigo-500",  q: "What is the role of the electron transport chain in ATP production?" },
    { time: "08:12", color: "bg-violet-500",  q: "Compare the ATP yield of glycolysis vs. the Krebs cycle." },
    { time: "15:47", color: "bg-fuchsia-500", q: "Why is anaerobic respiration less efficient?" },
  ]
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 animate-fade-up"
          style={{ opacity: 0, animationDelay: `${0.1 + i * 0.45}s` }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-bold text-white ${item.color} px-1.5 py-0.5 rounded`}>
              {item.time}
            </span>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Exercise</span>
          </div>
          <p className="text-xs text-indigo-900 leading-relaxed">{item.q}</p>
        </div>
      ))}
    </div>
  )
}

// ── Stage: Interactive ───────────────────────────────────────────────────────

function InteractiveStage() {
  return (
    <div className="flex flex-col gap-3.5">
      <p
        className="text-[11px] text-slate-500 animate-fade-up"
        style={{ opacity: 0, animationDelay: "0.1s" }}
      >
        Click any timestamp to see the source context
      </p>

      {/* Timestamp chips — middle one animates as if clicked */}
      <div className="flex gap-2 animate-fade-up" style={{ opacity: 0, animationDelay: "0.3s" }}>
        {[
          { time: "02:34", color: "bg-indigo-500",  active: false },
          { time: "08:12", color: "bg-violet-500",  active: true  },
          { time: "15:47", color: "bg-fuchsia-500", active: false },
        ].map((m) => (
          <div key={m.time} className="relative">
            {m.active && (
              <div className="absolute inset-0 rounded-lg bg-violet-400/40 animate-ping" style={{ animationDuration: "1.6s" }} />
            )}
            <span
              className={`relative text-[11px] font-bold text-white ${m.color} px-2.5 py-1 rounded-lg cursor-default block ${
                m.active ? "ring-2 ring-violet-300 ring-offset-1" : ""
              }`}
            >
              {m.time}
            </span>
          </div>
        ))}
      </div>

      {/* Source + exercise popup for the active timestamp */}
      <div
        className="bg-violet-50 border border-violet-200 rounded-xl p-3 animate-popup-show"
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-bold text-white bg-violet-500 px-1.5 py-0.5 rounded">08:12</span>
          <span className="text-[10px] text-slate-500 font-medium">Source transcript</span>
        </div>
        <p className="text-xs text-violet-900 leading-relaxed border-l-2 border-violet-200 pl-2">
          &ldquo;Glycolysis breaks glucose into two pyruvate molecules, yielding 2 ATP net gain.&rdquo;
        </p>
        <div className="mt-2 pt-2 border-t border-violet-100">
          <p className="text-[10px] text-violet-600 font-semibold">
            ↳ Exercise: Compare ATP yield of glycolysis vs. Krebs cycle.
          </p>
        </div>
      </div>
    </div>
  )
}
