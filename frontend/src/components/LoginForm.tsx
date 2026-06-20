"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { loginAction, signInWithGoogleAction } from "@/lib/actions/auth"

export default function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, null)
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  return (
    <div className="relative">
      {/* Owl sitting above the card */}
      <div className="flex justify-center relative z-10" style={{ marginBottom: "-19px" }}>
        <Image
          src="/owl.png"
          alt="Owl"
          width={80}
          height={80}
          className="drop-shadow-xl"
          priority
        />
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 px-8 pt-10 pb-8"
        style={{ boxShadow: "0 8px 32px rgba(99,102,241,0.13), 0 2px 8px rgba(99,102,241,0.07)" }}
      >
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to continue
            </p>
          </div>

          {registered && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-3 text-sm text-emerald-700 font-medium">
              Account created — you can now sign in.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link href="#" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {pending && (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <form action={signInWithGoogleAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.92c1.71-1.57 2.69-3.88 2.69-6.64z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.95v2.33C2.44 15.98 5.48 18 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.95C.34 6.22 0 7.57 0 9s.34 2.78.95 4.03l3.02-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.95 4.97l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
