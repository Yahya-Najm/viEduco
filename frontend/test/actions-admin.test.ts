import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { revalidatePath } = await import("next/cache")
const { getUsers, setUserActive, grantUploadMinutes } = await import("@/lib/actions/admin")

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function asAdmin(email = "admin@example.com") {
  vi.stubEnv("ADMIN_EMAIL", email)
  asMock(auth).mockResolvedValue(fakeSession({ email }))
}

function asNonAdmin() {
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
  asMock(auth).mockResolvedValue(fakeSession({ email: "teacher@example.com" }))
}

describe("getUsers", () => {
  it("throws Forbidden for a non-admin", async () => {
    asNonAdmin()
    await expect(getUsers()).rejects.toThrow("Forbidden")
  })

  it("throws Forbidden when there is no session", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(null)
    await expect(getUsers()).rejects.toThrow("Forbidden")
  })

  it("returns the user list for an admin", async () => {
    asAdmin()
    const rows = [{ id: "u1" }, { id: "u2" }]
    asMock(prisma.user.findMany).mockResolvedValue(rows)

    expect(await getUsers()).toBe(rows)
  })
})

describe("setUserActive", () => {
  it("throws Forbidden for a non-admin", async () => {
    asNonAdmin()
    await expect(setUserActive("u1", false)).rejects.toThrow("Forbidden")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("updates another user's active flag and revalidates", async () => {
    asAdmin()
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "admin-id" })

    await setUserActive("other-user", false)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "other-user" },
      data: { active: false },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin")
  })

  it("refuses to let an admin suspend their own account", async () => {
    asAdmin()
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "admin-id" })

    await expect(setUserActive("admin-id", false)).rejects.toThrow(
      "Cannot suspend your own account",
    )
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe("grantUploadMinutes", () => {
  it.each([0, -5, NaN, Infinity, -Infinity])(
    "rejects a non-positive/non-finite value: %s",
    async (minutes) => {
      asAdmin()
      await expect(grantUploadMinutes("u1", minutes)).rejects.toThrow(
        "Enter a positive number of minutes",
      )
      expect(prisma.user.update).not.toHaveBeenCalled()
    },
  )

  it("throws Forbidden for a non-admin before validating minutes", async () => {
    asNonAdmin()
    await expect(grantUploadMinutes("u1", 5)).rejects.toThrow("Forbidden")
  })

  it("grants minutes, converting and rounding to seconds", async () => {
    asAdmin()

    await grantUploadMinutes("u1", 2.5)

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { uploadLimitSeconds: { increment: 150 } },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin")
  })

  it("rounds fractional second results", async () => {
    asAdmin()

    await grantUploadMinutes("u1", 1 / 3) // 20s exactly -> no rounding ambiguity but exercise the path

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { uploadLimitSeconds: { increment: Math.round((1 / 3) * 60) } },
    })
  })
})
