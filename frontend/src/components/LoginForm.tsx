"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { loginAction } from "@/lib/actions/auth"

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
