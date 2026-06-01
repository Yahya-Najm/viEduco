import { LiveTranscriber } from "@/components/LiveTranscriber"

export const metadata = { title: "Live Transcribe — viEduco" }

export default function LivePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live transcribe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Speak into your microphone and see the text appear in real time
        </p>
      </div>
      <LiveTranscriber />
    </div>
  )
}
