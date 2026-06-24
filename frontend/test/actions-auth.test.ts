import { beforeEach, describe, expect, it, vi } from "vitest"
import bcrypt from "bcryptjs"
import { createMockPrisma } from "./helpers/mockPrisma"
import { makeFormData } from "./helpers/session"
import { asMock } from "./helpers/asMock"

// Mocked instead of importing the real "next-auth" package: under vitest's SSR
// module graph, next-auth's internals try to `require("next/server")` and fail
// to resolve (a Next/Vite interop quirk, not a code issue) — irrelevant to what
// we're testing here, which is purely `actions/auth.ts`'s own branching.
class FakeAuthError extends Error {}
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }))
vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

const { prisma } = await import("@/lib/prisma")
const { signIn } = await import("@/lib/auth")
const { AuthError } = await import("next-auth")
const { registerAction, loginAction, signInWithGoogleAction } = await import(
  "@/lib/actions/auth"
)

beforeEach(() => {
  vi.resetAllMocks()
})

describe("registerAction", () => {
  it.each([
    ["name", { name: "", email: "a@b.com", password: "password1", confirm: "password1" }],
    ["email", { name: "Jane", email: "", password: "password1", confirm: "password1" }],
    ["password", { name: "Jane", email: "a@b.com", password: "", confirm: "password1" }],
    ["confirm", { name: "Jane", email: "a@b.com", password: "password1", confirm: "" }],
  ])("rejects when %s is missing", async (_field, fields) => {
    const result = await registerAction(null, makeFormData(fields))
    expect(result).toBe("All fields are required.")
  })

  it.each(["not-an-email", "missing-at-sign.com", "two@@at.com", "no-domain@"])(
    "rejects an invalid email address: %s",
    async (email) => {
      const result = await registerAction(
        null,
        makeFormData({ name: "Jane", email, password: "password1", confirm: "password1" }),
      )
      expect(result).toBe("Enter a valid email address.")
    },
  )

  it("rejects a password shorter than 8 characters", async () => {
    const result = await registerAction(
      null,
      makeFormData({ name: "Jane", email: "jane@example.com", password: "short", confirm: "short" }),
    )
    expect(result).toBe("Password must be at least 8 characters.")
  })

  it("rejects mismatched password confirmation", async () => {
    const result = await registerAction(
      null,
      makeFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "password1",
        confirm: "password2",
      }),
    )
    expect(result).toBe("Passwords do not match.")
  })

  it("rejects a duplicate email", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue({ id: "existing" })

    const result = await registerAction(
      null,
      makeFormData({
        name: "Jane",
        email: "jane@example.com",
        password: "password1",
        confirm: "password1",
      }),
    )

    expect(result).toBe("An account with this email already exists.")
  })

  it("normalizes name/email, hashes the password, creates the user, and redirects", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue(null)
    asMock(prisma.user.create).mockResolvedValue({ id: "new-user" })

    await expect(
      registerAction(
        null,
        makeFormData({
          name: "  Jane  ",
          email: "  Jane@Example.com  ",
          password: "password1",
          confirm: "password1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/login?registered=1")

    expect(prisma.user.create).toHaveBeenCalledTimes(1)
    const data = asMock(prisma.user.create).mock.calls[0][0].data
    expect(data.name).toBe("Jane")
    expect(data.email).toBe("jane@example.com")
    expect(data.hashedPassword).not.toBe("password1")
    expect(await bcrypt.compare("password1", data.hashedPassword)).toBe(true)
  })
})

describe("signInWithGoogleAction", () => {
  it("delegates to signIn with the google provider", async () => {
    await signInWithGoogleAction()
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" })
  })
})

describe("loginAction", () => {
  it("returns a friendly message on AuthError", async () => {
    asMock(signIn).mockRejectedValue(new AuthError("CredentialsSignin"))

    const result = await loginAction(
      null,
      makeFormData({ email: "jane@example.com", password: "password1" }),
    )

    expect(result).toBe("Invalid email or password.")
  })

  it("re-throws non-AuthError errors (e.g. the NEXT_REDIRECT signal on success)", async () => {
    asMock(signIn).mockRejectedValue(new Error("NEXT_REDIRECT:/dashboard"))

    await expect(
      loginAction(null, makeFormData({ email: "jane@example.com", password: "password1" })),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard")
  })

  it("returns null when signIn resolves without throwing", async () => {
    asMock(signIn).mockResolvedValue(undefined)

    const result = await loginAction(
      null,
      makeFormData({ email: "jane@example.com", password: "password1" }),
    )

    expect(result).toBeNull()
  })
})
