import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const filename     = searchParams.get("filename")
  const content_type = searchParams.get("content_type") ?? "video/mp4"

  if (!filename) {
    return NextResponse.json({ detail: "filename required" }, { status: 400 })
  }

  const apiUrl      = process.env.API_URL
  const internalKey = process.env.INTERNAL_API_KEY

  if (!apiUrl) {
    return NextResponse.json({ detail: "API_URL not configured" }, { status: 503 })
  }

  const upstream = await fetch(
    `${apiUrl}/presigned-upload?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(content_type)}`,
    { headers: internalKey ? { "X-Internal-Key": internalKey } : {} },
  )

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
