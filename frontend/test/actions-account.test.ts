import { beforeEach, describe, expect, it, vi } from "vitest"
import bcrypt from "bcryptjs"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession, makeFormData } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const { revalidatePath } = await import("next/cache")
const { updateProfileAction, setPasswordAction } = await import("@/lib/actions/account")

beforeEach(() => {
  vi.resetAllMocks()
})

describe("updateProfileAction", () => {
  it("rejects when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    const result = await updateProfileAction(null, makeFormData({ name: "Jane" }))

    expect(result).toBe("Not signed in.")
  })

  it("rejects when name is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession())

    const result = await updateProfileAction(null, makeFormData({ name: "  " }))

    expect(result).toBe("Name is required.")
  })

  it("trims fields, nulls out empty optional fields, updates, and revalidates", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))

    const result = await updateProfileAction(
      null,
      makeFormData({ name: "  Jane  ", image: "", organization: "  Acme  ", jobTitle: "" }),
    )

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Jane", image: null, organization: "Acme", jobTitle: null },
    })
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/account")
    expect(result).toBeNull()
  })
})

describe("setPasswordAction", () => {
  it("rejects when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    const result = await setPasswordAction(null, makeFormData({ newPassword: "password1", confirm: "password1" }))

    expect(result).toBe("Not signed in.")
  })

  it.each([
    ["newPassword", { newPassword: "", confirm: "password1" }],
    ["confirm", { newPassword: "password1", confirm: "" }],
  ])("rejects when %s is missing", async (_field, fields) => {
    asMock(auth).mockResolvedValue(fakeSession())

    const result = await setPasswordAction(null, makeFormData(fields))

    expect(result).toBe("All fields are required.")
  })

  it("rejects a short new password", async () => {
    asMock(auth).mockResolvedValue(fakeSession())

    const result = await setPasswordAction(
      null,
      makeFormData({ newPassword: "short", confirm: "short" }),
    )

    expect(result).toBe("Password must be at least 8 characters.")
  })

  it("rejects mismatched confirmation", async () => {
    asMock(auth).mockResolvedValue(fakeSession())

    const result = await setPasswordAction(
      null,
      makeFormData({ newPassword: "password1", confirm: "password2" }),
    )

    expect(result).toBe("Passwords do not match.")
  })

  it("rejects when the user record is missing", async () => {
    asMock(auth).mockResolvedValue(fakeSession())
    asMock(prisma.user.findUnique).mockResolvedValue(null)

    const result = await setPasswordAction(
      null,
      makeFormData({ newPassword: "password1", confirm: "password1" }),
    )

    expect(result).toBe("Not signed in.")
  })

  it("does not require currentPassword when the user has no existing password set", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({ hashedPassword: null })

    const result = await setPasswordAction(
      null,
      makeFormData({ newPassword: "password1", confirm: "password1" }),
    )

    expect(result).toBeNull()
    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    const data = asMock(prisma.user.update).mock.calls[0][0].data
    expect(await bcrypt.compare("password1", data.hashedPassword)).toBe(true)
  })

  it("requires currentPassword when the user already has a password", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      hashedPassword: await bcrypt.hash("oldpassword", 4),
    })

    const result = await setPasswordAction(
      null,
      makeFormData({ newPassword: "password1", confirm: "password1" }),
    )

    expect(result).toBe("Current password is required.")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("rejects an incorrect current password", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      hashedPassword: await bcrypt.hash("oldpassword", 4),
    })

    const result = await setPasswordAction(
      null,
      makeFormData({
        currentPassword: "wrong",
        newPassword: "password1",
        confirm: "password1",
      }),
    )

    expect(result).toBe("Current password is incorrect.")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("updates the password on success and revalidates", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      hashedPassword: await bcrypt.hash("oldpassword", 4),
    })

    const result = await setPasswordAction(
      null,
      makeFormData({
        currentPassword: "oldpassword",
        newPassword: "password1",
        confirm: "password1",
      }),
    )

    expect(result).toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/account")
    const data = asMock(prisma.user.update).mock.calls[0][0].data
    expect(await bcrypt.compare("password1", data.hashedPassword)).toBe(true)
  })
})
