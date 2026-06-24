import { afterEach, describe, expect, it, vi } from "vitest"
import { isAdminEmail } from "@/lib/admin"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("isAdminEmail", () => {
  it("returns false when ADMIN_EMAIL is not configured", () => {
    vi.stubEnv("ADMIN_EMAIL", "")
    expect(isAdminEmail("anyone@example.com")).toBe(false)
  })

  it("returns false for undefined/null email even when ADMIN_EMAIL is set", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })

  it("returns true on an exact match", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    expect(isAdminEmail("admin@example.com")).toBe(true)
  })

  it("is case-sensitive", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    expect(isAdminEmail("Admin@Example.com")).toBe(false)
  })

  it("does not match a whitespace-padded variant", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    expect(isAdminEmail(" admin@example.com ")).toBe(false)
  })

  it("does not match a substring of the admin email", () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    expect(isAdminEmail("admin@example.co")).toBe(false)
  })
})
