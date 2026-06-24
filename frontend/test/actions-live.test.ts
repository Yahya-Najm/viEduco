import crypto from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { getLiveToken } = await import("@/lib/actions/live")

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getLiveToken", () => {
  it("returns null when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    expect(await getLiveToken()).toBeNull()
  })

  it("returns null when the user record is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    expect(await getLiveToken()).toBeNull()
  })

  it("returns null when the user is inactive", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: false })

    expect(await getLiveToken()).toBeNull()
  })

  it("issues a valid HMAC token with a ~120s expiry and the default ws URL", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "secret-key")
    delete process.env.LIVE_TRANSCRIBE_URL
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const before = Math.floor(Date.now() / 1000)
    const result = await getLiveToken()
    const after = Math.floor(Date.now() / 1000)

    expect(result).not.toBeNull()
    expect(result!.wsUrl).toBe("ws://localhost:8001/ws/transcribe")

    const [expiryStr, sig] = result!.token.split(".")
    const expiry = Number(expiryStr)
    expect(expiry).toBeGreaterThanOrEqual(before + 119)
    expect(expiry).toBeLessThanOrEqual(after + 121)

    const expectedSig = crypto.createHmac("sha256", "secret-key").update(expiryStr).digest("hex")
    expect(sig).toBe(expectedSig)
  })

  it("derives wss:// from an https LIVE_TRANSCRIBE_URL and strips a trailing slash", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "secret-key")
    vi.stubEnv("LIVE_TRANSCRIBE_URL", "https://live.example.com/")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const result = await getLiveToken()

    expect(result!.wsUrl).toBe("wss://live.example.com/ws/transcribe")
  })

  it("falls back to the default URL when LIVE_TRANSCRIBE_URL is an empty string (fixed: || instead of ??)", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "secret-key")
    vi.stubEnv("LIVE_TRANSCRIBE_URL", "")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const result = await getLiveToken()

    expect(result!.wsUrl).toBe("ws://localhost:8001/ws/transcribe")
  })

  it("uses an empty-string HMAC key when INTERNAL_API_KEY is unset", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ active: true })

    const result = await getLiveToken()
    const [expiryStr, sig] = result!.token.split(".")
    const expectedSig = crypto.createHmac("sha256", "").update(expiryStr).digest("hex")

    expect(sig).toBe(expectedSig)
  })
})
