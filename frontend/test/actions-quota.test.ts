import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { getQuotaStatus, checkUploadAllowed } = await import("@/lib/actions/quota")

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("getQuotaStatus", () => {
  it("returns null when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    expect(await getQuotaStatus()).toBeNull()
  })

  it("returns unlimited status for the admin email", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "admin@example.com" }))

    const status = await getQuotaStatus()

    expect(status).toEqual({
      unlimited: true,
      limitSeconds: 0,
      usedSeconds: 0,
      remainingSeconds: Infinity,
    })
  })

  it("computes remaining seconds for a regular user", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 600,
      uploadSecondsUsed: 200,
    })

    const status = await getQuotaStatus()

    expect(status).toEqual({
      unlimited: false,
      limitSeconds: 600,
      usedSeconds: 200,
      remainingSeconds: 400,
    })
  })

  it("returns null when the user record is missing", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    expect(await getQuotaStatus()).toBeNull()
  })
})

describe("checkUploadAllowed", () => {
  it("throws Unauthorized when there is no session (status is null)", async () => {
    asMock(auth).mockResolvedValue(null)

    await expect(checkUploadAllowed(999_999)).rejects.toThrow("Unauthorized")
  })

  it("throws Unauthorized when the user record is missing", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    await expect(checkUploadAllowed(10)).rejects.toThrow("Unauthorized")
  })

  it("allows any duration for an unlimited (admin) user", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "admin@example.com" }))

    expect(await checkUploadAllowed(999_999)).toEqual({ ok: true })
  })

  it("rejects as exhausted when remaining seconds is exactly 0", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 100,
    })

    expect(await checkUploadAllowed(1)).toEqual({
      ok: false,
      reason: "exhausted",
      remainingSeconds: 0,
    })
  })

  it("rejects as exceeds when duration is greater than remaining", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 50,
    })

    expect(await checkUploadAllowed(51)).toEqual({
      ok: false,
      reason: "exceeds",
      remainingSeconds: 50,
    })
  })

  it("allows a duration within the remaining quota", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 50,
    })

    expect(await checkUploadAllowed(10)).toEqual({ ok: true })
  })

  it("allows a duration exactly equal to the remaining quota (boundary, strict >)", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 50,
    })

    expect(await checkUploadAllowed(50)).toEqual({ ok: true })
  })
})
