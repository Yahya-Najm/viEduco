import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { GET } = await import("@/app/api/storage/presigned-download/route")

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/storage/presigned-download${query}`)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("GET /api/storage/presigned-download", () => {
  it("returns 401 when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    const res = await GET(makeRequest("?key=videos/a.mp4"))

    expect(res.status).toBe(401)
  })

  it("returns 403 when the user is inactive (now consistent with the other two storage routes)", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: false })

    const res = await GET(makeRequest("?key=videos/a.mp4"))

    expect(res.status).toBe(403)
  })

  it("returns 403 when the user record is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    const res = await GET(makeRequest("?key=videos/a.mp4"))

    expect(res.status).toBe(403)
  })

  it("returns 400 when key is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const res = await GET(makeRequest(""))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ detail: "key required" })
  })

  it("returns 503 when API_URL is not configured", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "")

    const res = await GET(makeRequest("?key=videos/a.mp4"))

    expect(res.status).toBe(503)
  })

  it("forwards the key (url-encoded) and internal key header, relaying the upstream response", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "secret")
    asMock(fetch).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://r2/get-signed" }), { status: 200 }),
    )

    const res = await GET(makeRequest("?key=videos%2Fa%20b.mp4"))

    const [url, init] = asMock(fetch).mock.calls[0]
    expect(url).toBe("http://backend/presigned-download?key=videos%2Fa%20b.mp4")
    expect(init.headers).toEqual({ "X-Internal-Key": "secret" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: "https://r2/get-signed" })
  })

  it("omits the internal-key header when INTERNAL_API_KEY is unset", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "")
    asMock(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

    await GET(makeRequest("?key=videos/a.mp4"))

    const [, init] = asMock(fetch).mock.calls[0]
    expect(init.headers).toEqual({})
  })

  it("relays a non-2xx upstream status", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    asMock(fetch).mockResolvedValue(new Response(JSON.stringify({ detail: "not found" }), { status: 404 }))

    const res = await GET(makeRequest("?key=missing"))

    expect(res.status).toBe(404)
  })
})
