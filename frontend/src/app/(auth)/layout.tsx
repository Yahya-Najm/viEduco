export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* Left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 65%, #5b21b6 100%)",
        }}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">viEduco</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex flex-col gap-6">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
            Every meeting deserves a clear record.
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed max-w-sm">
            Upload your recording. Let AI handle the rest — transcription, speaker separation, and a structured protocol ready to share.
          </p>

          {/* Feature list */}
          <ul className="flex flex-col gap-3 mt-2">
            {[
              "Automatic transcription with Whisper",
              "Speaker diarization via pyannote",
              "GPT-5 protocol generation",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-indigo-100 text-sm">
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom quote */}
        <p className="relative z-10 text-indigo-300/60 text-xs">
          © {new Date().getFullYear()} viEduco. Built with FastAPI + Next.js.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-slate-950 px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 dark:text-white text-lg">viEduco</span>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
