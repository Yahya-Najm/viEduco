import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { active: true } })
  if (!user?.active) {
    return NextResponse.json({ detail: "Your account has been suspended." }, { status: 403 })
  }

  const key = req.nextUrl.searchParams.get("key")
  if (!key) {
    return NextResponse.json({ detail: "key required" }, { status: 400 })
  }

  const apiUrl      = process.env.API_URL
  const internalKey = process.env.INTERNAL_API_KEY

  if (!apiUrl) {
    return NextResponse.json({ detail: "API_URL not configured" }, { status: 503 })
  }

  const upstream = await fetch(
    `${apiUrl}/presigned-download?key=${encodeURIComponent(key)}`,
    { headers: internalKey ? { "X-Internal-Key": internalKey } : {} },
  )

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
