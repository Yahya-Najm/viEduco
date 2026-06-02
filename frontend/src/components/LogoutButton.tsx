"use client"

import { signOut } from "next-auth/react"

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-slate-400 hover:text-red-500 transition-colors"
    >
      Sign out
    </button>
  )
}
