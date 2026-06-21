import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { LogoutButton } from "@/components/LogoutButton"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth={2}>
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-base">viEduco</span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-4">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors whitespace-nowrap">
              Library
            </Link>
            <Link href="/dashboard/live" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors whitespace-nowrap">
              Live
            </Link>
            {isAdminEmail(session.user.email) && (
              <Link href="/dashboard/admin" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors whitespace-nowrap">
                Admin
              </Link>
            )}
            <Link href="/dashboard/upload" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap">
              + Upload
            </Link>
            <Link href="/dashboard/account" className="text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors truncate max-w-[120px] sm:max-w-[220px]">
              {session.user.name ?? session.user.email}
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
