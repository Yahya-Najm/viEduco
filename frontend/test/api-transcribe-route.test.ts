import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { POST } = await import("@/app/api/transcribe/route")

function makeRequest(formData: FormData) {
  return new NextRequest("http://localhost/api/transcribe", { method: "POST", body: formData })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/transcribe", () => {
  it("returns 401 when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    const res = await POST(makeRequest(new FormData()))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ detail: "Unauthorized" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("returns 403 when the user is inactive", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: false })

    const res = await POST(makeRequest(new FormData()))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ detail: "Your account has been suspended." })
  })

  it("returns 403 when the user record is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest(new FormData()))

    expect(res.status).toBe(403)
  })

  it("returns 503 when API_URL is not configured", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "")

    const res = await POST(makeRequest(new FormData()))

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ detail: "API_URL not configured" })
  })

  it("forwards the upload to the backend with the internal key header and relays status/body", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "secret")
    asMock(fetch).mockResolvedValue(new Response(JSON.stringify({ segments: [] }), { status: 200 }))

    const fd = new FormData()
    fd.set("file", new Blob(["audio-bytes"]), "meeting.mp3")

    const res = await POST(makeRequest(fd))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = asMock(fetch).mock.calls[0]
    expect(url).toBe("http://backend/transcribe")
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({ "X-Internal-Key": "secret" })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ segments: [] })
  })

  it("omits the internal-key header when INTERNAL_API_KEY is unset", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "")
    asMock(fetch).mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

    await POST(makeRequest(new FormData()))

    const [, init] = asMock(fetch).mock.calls[0]
    expect(init.headers).toEqual({})
  })

  it("relays a non-2xx upstream status (e.g. 422 validation error)", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })
    vi.stubEnv("API_URL", "http://backend")
    asMock(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "File is empty." }), { status: 422 }),
    )

    const res = await POST(makeRequest(new FormData()))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ detail: "File is empty." })
  })
})
