"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"

export type QuotaStatus = {
  unlimited: boolean
  limitSeconds: number
  usedSeconds: number
  remainingSeconds: number
}

export async function getQuotaStatus(): Promise<QuotaStatus | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  if (isAdminEmail(session.user.email)) {
    return { unlimited: true, limitSeconds: 0, usedSeconds: 0, remainingSeconds: Infinity }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { uploadLimitSeconds: true, uploadSecondsUsed: true },
  })
  if (!user) return null

  return {
    unlimited: false,
    limitSeconds: user.uploadLimitSeconds,
    usedSeconds: user.uploadSecondsUsed,
    remainingSeconds: Math.max(0, user.uploadLimitSeconds - user.uploadSecondsUsed),
  }
}

export type QuotaCheckResult =
  | { ok: true }
  | { ok: false; reason: "exhausted" | "exceeds"; remainingSeconds: number }

export async function checkUploadAllowed(durationSeconds: number): Promise<QuotaCheckResult> {
  const status = await getQuotaStatus()
  if (!status || status.unlimited) return { ok: true }

  if (status.remainingSeconds <= 0) {
    return { ok: false, reason: "exhausted", remainingSeconds: 0 }
  }
  if (durationSeconds > status.remainingSeconds) {
    return { ok: false, reason: "exceeds", remainingSeconds: status.remainingSeconds }
  }
  return { ok: true }
}
