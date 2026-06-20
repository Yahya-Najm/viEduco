"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function updateProfileAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return "Not signed in."

  const name         = (formData.get("name") as string)?.trim()
  const image        = (formData.get("image") as string)?.trim()
  const organization = (formData.get("organization") as string)?.trim()
  const jobTitle      = (formData.get("jobTitle") as string)?.trim()

  if (!name) return "Name is required."

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      image: image || null,
      organization: organization || null,
      jobTitle: jobTitle || null,
    },
  })

  revalidatePath("/dashboard/account")
  return null
}

export async function setPasswordAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return "Not signed in."

  const currentPassword = formData.get("currentPassword") as string | null
  const newPassword      = formData.get("newPassword") as string
  const confirm          = formData.get("confirm") as string

  if (!newPassword || !confirm) return "All fields are required."
  if (newPassword.length < 8) return "Password must be at least 8 characters."
  if (newPassword !== confirm) return "Passwords do not match."

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  })
  if (!user) return "Not signed in."

  if (user.hashedPassword) {
    if (!currentPassword) return "Current password is required."
    const valid = await bcrypt.compare(currentPassword, user.hashedPassword)
    if (!valid) return "Current password is incorrect."
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword },
  })

  revalidatePath("/dashboard/account")
  return null
}
