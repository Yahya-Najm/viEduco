import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  const apiUrl      = process.env.API_URL
  const internalKey = process.env.INTERNAL_API_KEY

  if (!apiUrl) {
    return NextResponse.json({ detail: "API_URL not configured" }, { status: 503 })
  }

  const body = await req.formData()

  const upstream = await fetch(`${apiUrl}/transcribe`, {
    method:  "POST",
    headers: internalKey ? { "X-Internal-Key": internalKey } : {},
    body,
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
