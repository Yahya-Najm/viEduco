import Link from "next/link"
import PipelineCard from "@/components/PipelineCard"

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden flex flex-col">

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99,102,241,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99,102,241,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute -top-40 -left-40 w-[480px] h-[480px] bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span className="text-slate-900 font-bold text-lg tracking-tight">viEduco</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
              Sign in
            </Link>
            <Link href="/register" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold shadow-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center max-w-6xl mx-auto w-full px-6 py-16 gap-16">

        {/* Left */}
        <div className="flex flex-col flex-1 max-w-[520px]">

          <div className="inline-flex w-fit items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Agentic learning pipeline
          </div>

          <h1 className="text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-5">
            Every video becomes an{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              interactive lesson
            </span>
          </h1>

          <p className="text-[17px] text-slate-600 leading-relaxed mb-8">
            Upload a lecture or educational video. viEduco transcribes it, detects key moments, and automatically generates exercises anchored to each timestamp — ready to assign.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link
              href="/register"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200/60 text-sm text-center"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-xl transition-colors text-sm text-center shadow-sm"
            >
              Sign in
            </Link>
          </div>

          {/* Pipeline steps */}
          <div className="flex flex-col gap-2">
            {[
              { step: "1", label: "Transcribe", desc: "Whisper speech-to-text with speaker diarization" },
              { step: "2", label: "Detect moments", desc: "Agent identifies key concepts by timestamp" },
              { step: "3", label: "Generate exercises", desc: "GPT-5 creates targeted questions per segment" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {s.step}
                </span>
                <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                <span className="text-sm text-slate-500">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — animated pipeline card */}
        <div className="hidden lg:flex flex-1 items-center justify-end">
          <div className="relative w-full max-w-[360px]">

            {/* Top floating badge */}
            <div className="absolute -top-5 -left-6 z-20 animate-float-slow">
              <div className="bg-white border border-slate-200 shadow-lg rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
                <span className="text-lg">🎬</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">AI pipeline</span>
                  <span className="text-[11px] text-slate-500">live preview</span>
                </div>
              </div>
            </div>

            <div className="animate-float">
              <PipelineCard />
            </div>

            {/* Bottom floating badge */}
            <div className="absolute -bottom-5 -right-6 z-20 animate-float">
              <div className="bg-white border border-slate-200 shadow-lg rounded-2xl px-3.5 py-2.5 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">Fully automated</span>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
