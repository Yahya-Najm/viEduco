"use server"

import crypto from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getLiveToken(): Promise<{ wsUrl: string; token: string } | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { active: true } })
  if (!user?.active) return null

  const key = process.env.INTERNAL_API_KEY ?? ""
  const liveUrl = (process.env.LIVE_TRANSCRIBE_URL || "http://localhost:8001").replace(/\/$/, "")
  const wsUrl = liveUrl.replace(/^http/, "ws") + "/ws/transcribe"

  const expiry = Math.floor(Date.now() / 1000) + 120
  const payload = String(expiry)
  const sig = crypto.createHmac("sha256", key).update(payload).digest("hex")

  return { wsUrl, token: `${payload}.${sig}` }
}
