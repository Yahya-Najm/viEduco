import UploadForm from "@/components/UploadForm"

export const metadata = { title: "Upload — viEduco" }

export default function UploadPage() {
  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload file</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a video or audio file. Videos are converted to audio in your browser before transcription.
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <UploadForm />
      </div>
    </div>
  )
}
