"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"

type Segment = {
  speaker: string
  start_time: number
  end_time: number
  text: string
}

export type SaveTranscriptionResult =
  | { ok: true; id: string }
  | { ok: false; reason: "exhausted" | "exceeds" }

export async function saveTranscription(data: {
  title: string
  sourceType: "video" | "audio"
  sourceKey?: string
  durationMs?: number
  segments: Segment[]
}): Promise<SaveTranscriptionResult> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const admin = isAdminEmail(session.user.email)
  const durationSeconds = Math.round((data.durationMs ?? 0) / 1000)

  return prisma.$transaction(async (tx) => {
    if (!admin) {
      const user = await tx.user.findUnique({
        where:  { id: session.user!.id },
        select: { uploadLimitSeconds: true, uploadSecondsUsed: true },
      })
      const remaining = (user?.uploadLimitSeconds ?? 0) - (user?.uploadSecondsUsed ?? 0)
      if (remaining <= 0) return { ok: false, reason: "exhausted" }
      if (durationSeconds > remaining) return { ok: false, reason: "exceeds" }

      await tx.user.update({
        where: { id: session.user!.id },
        data:  { uploadSecondsUsed: { increment: durationSeconds } },
      })
    }

    const created = await tx.transcription.create({
      data: {
        userId:     session.user!.id,
        title:      data.title,
        sourceType: data.sourceType,
        sourceKey:  data.sourceKey,
        durationMs: data.durationMs,
        segments:   data.segments,
      },
    })
    return { ok: true, id: created.id }
  })
}

export async function getTranscriptions() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.transcription.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      title:      true,
      sourceType: true,
      durationMs: true,
      status:     true,
      createdAt:  true,
    },
  })
}

export async function getTranscription(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.transcription.findFirst({
    where: { id, userId: session.user.id },
  })
}

export async function deleteTranscription(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const transcription = await prisma.transcription.findFirst({
    where: { id, userId: session.user.id },
    select: { sourceKey: true },
  })
  if (!transcription) throw new Error("Not found")

  if (transcription.sourceKey) {
    const apiUrl      = process.env.API_URL
    const internalKey = process.env.INTERNAL_API_KEY
    if (apiUrl) {
      await fetch(
        `${apiUrl}/storage?key=${encodeURIComponent(transcription.sourceKey)}`,
        {
          method:  "DELETE",
          headers: internalKey ? { "X-Internal-Key": internalKey } : {},
        },
      ).catch(() => {})
    }
  }

  await prisma.transcription.delete({ where: { id } })
  redirect("/dashboard")
}
