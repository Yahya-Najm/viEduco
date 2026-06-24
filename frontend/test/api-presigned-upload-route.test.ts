import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { GET } = await import("@/app/api/storage/presigned-upload/route")

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/storage/presigned-upload${query}`)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/storage/presigned-upload", () => {
  it("returns 401 when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    const res = await GET(makeRequest("?filename=a.mp4"))

    expect(res.status).toBe(401)
  })

  it("returns 403 when the user is inactive", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: false })

    const res = await GET(makeRequest("?filename=a.mp4"))

    expect(res.status).toBe(403)
  })

  it("returns 400 when filename is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const res = await GET(makeRequest(""))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ detail: "filename required" })
  })

  it("returns 503 when API_URL is not configured", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "")

    const res = await GET(makeRequest("?filename=a.mp4"))

    expect(res.status).toBe(503)
  })

  it("defaults content_type to video/mp4 and forwards to the backend", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "secret")
    asMock(fetch).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://r2/put", key: "videos/x" }), { status: 200 }),
    )

    const res = await GET(makeRequest("?filename=a.mp4"))

    const [url, init] = asMock(fetch).mock.calls[0]
    expect(url).toBe(
      "http://backend/presigned-upload?filename=a.mp4&content_type=video%2Fmp4",
    )
    expect(init.headers).toEqual({ "X-Internal-Key": "secret" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: "https://r2/put", key: "videos/x" })
  })

  it("forwards an explicit content_type and url-encodes special characters in filename", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    asMock(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

    await GET(makeRequest("?filename=my%20file.wav&content_type=audio/wav"))

    const [url] = asMock(fetch).mock.calls[0]
    expect(url).toBe(
      "http://backend/presigned-upload?filename=my%20file.wav&content_type=audio%2Fwav",
    )
  })
})
