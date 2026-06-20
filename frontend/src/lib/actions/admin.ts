"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"

async function requireAdmin() {
  const session = await auth()
  if (!isAdminEmail(session?.user?.email)) throw new Error("Forbidden")
  return session!
}

export async function getUsers() {
  await requireAdmin()
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id:                 true,
      name:               true,
      email:              true,
      active:             true,
      createdAt:          true,
      uploadLimitSeconds: true,
      uploadSecondsUsed:  true,
      _count: { select: { transcriptions: true } },
    },
  })
}

export async function setUserActive(userId: string, active: boolean) {
  const session = await requireAdmin()
  const adminUser = await prisma.user.findUnique({
    where:  { email: session.user!.email! },
    select: { id: true },
  })
  if (adminUser?.id === userId) throw new Error("Cannot suspend your own account")
  await prisma.user.update({ where: { id: userId }, data: { active } })
  revalidatePath("/dashboard/admin")
}

export async function grantUploadMinutes(userId: string, minutes: number) {
  await requireAdmin()
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Enter a positive number of minutes")

  await prisma.user.update({
    where: { id: userId },
    data:  { uploadLimitSeconds: { increment: Math.round(minutes * 60) } },
  })
  revalidatePath("/dashboard/admin")
}
