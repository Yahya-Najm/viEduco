"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/prisma"
import { signIn } from "@/lib/auth"

export async function registerAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const name     = (formData.get("name")     as string)?.trim()
  const email    = (formData.get("email")    as string)?.trim().toLowerCase()
  const password = (formData.get("password") as string)
  const confirm  = (formData.get("confirm")  as string)

  if (!name || !email || !password || !confirm) {
    return "All fields are required."
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address."
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters."
  }
  if (password !== confirm) {
    return "Passwords do not match."
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return "An account with this email already exists."
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: { name, email, hashedPassword },
  })

  redirect("/login?registered=1")
}

export async function signInWithGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard" })
}

export async function loginAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email:      formData.get("email"),
      password:   formData.get("password"),
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password."
    }
    throw error // re-throw Next.js redirect
  }
  return null
}
