"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Segment = {
  speaker: string
  start_time: number
  end_time: number
  text: string
}

export async function saveTranscription(data: {
  title: string
  sourceType: "video" | "audio"
  sourceKey?: string
  durationMs?: number
  segments: Segment[]
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.transcription.create({
    data: {
      userId:     session.user.id,
      title:      data.title,
      sourceType: data.sourceType,
      sourceKey:  data.sourceKey,
      durationMs: data.durationMs,
      segments:   data.segments,
    },
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
