"use server"

import crypto from "crypto"
import { auth } from "@/lib/auth"

export async function getLiveToken(): Promise<{ wsUrl: string; token: string } | null> {
  const session = await auth()
  if (!session?.user) return null

  const key = process.env.INTERNAL_API_KEY ?? ""
  const apiUrl = process.env.API_URL ?? "http://localhost:8000"
  const wsUrl = apiUrl.replace(/^http/, "ws") + "/ws/transcribe"

  const expiry = Math.floor(Date.now() / 1000) + 120
  const payload = String(expiry)
  const sig = crypto.createHmac("sha256", key).update(payload).digest("hex")

  return { wsUrl, token: `${payload}.${sig}` }
}
