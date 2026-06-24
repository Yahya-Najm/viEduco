import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockPrisma } from "./helpers/mockPrisma"
import { fakeSession } from "./helpers/session"
import { asMock } from "./helpers/asMock"

vi.mock("@/lib/prisma", () => ({ prisma: createMockPrisma() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

const { prisma } = await import("@/lib/prisma")
const { auth } = await import("@/lib/auth")
const {
  saveTranscription,
  getTranscriptions,
  getTranscription,
  deleteTranscription,
} = await import("@/lib/actions/transcription")

const baseSegments = [{ speaker: "A", start_time: 0, end_time: 1, text: "hi" }]

beforeEach(() => {
  vi.resetAllMocks()
  asMock(prisma.$transaction).mockImplementation((cb: (tx: typeof prisma) => unknown) =>
    cb(prisma),
  )
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("saveTranscription", () => {
  it("throws Unauthorized when there is no session", async () => {
    asMock(auth).mockResolvedValue(null)

    await expect(
      saveTranscription({ title: "t", sourceType: "audio", segments: baseSegments }),
    ).rejects.toThrow("Unauthorized")
  })

  it("bypasses the quota check entirely for an admin", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ id: "admin-1", email: "admin@example.com" }))
    asMock(prisma.transcription.create).mockResolvedValue({ id: "tr-1" })

    const result = await saveTranscription({
      title: "t",
      sourceType: "audio",
      durationMs: 999_999_000,
      segments: baseSegments,
    })

    expect(result).toEqual({ ok: true, id: "tr-1" })
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("returns exhausted without writing anything when remaining quota is 0", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1", email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 100,
    })

    const result = await saveTranscription({
      title: "t",
      sourceType: "audio",
      durationMs: 1000,
      segments: baseSegments,
    })

    expect(result).toEqual({ ok: false, reason: "exhausted" })
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.transcription.create).not.toHaveBeenCalled()
  })

  it("returns exceeds without writing anything when duration is over the remaining quota", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1", email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 50,
    })

    const result = await saveTranscription({
      title: "t",
      sourceType: "audio",
      durationMs: 60_000, // 60s > 50s remaining
      segments: baseSegments,
    })

    expect(result).toEqual({ ok: false, reason: "exceeds" })
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.transcription.create).not.toHaveBeenCalled()
  })

  it("increments usage and creates the row on success for a regular user", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1", email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 50,
    })
    asMock(prisma.transcription.create).mockResolvedValue({ id: "tr-2" })

    const result = await saveTranscription({
      title: "t",
      sourceType: "video",
      sourceKey: "videos/abc.mp4",
      durationMs: 30_000,
      segments: baseSegments,
    })

    expect(result).toEqual({ ok: true, id: "tr-2" })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { uploadSecondsUsed: { increment: 30 } },
    })
    expect(prisma.transcription.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        title: "t",
        sourceType: "video",
        sourceKey: "videos/abc.mp4",
        durationMs: 30_000,
        segments: baseSegments,
      },
    })
  })

  it("treats a missing durationMs as zero duration", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com")
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1", email: "user@example.com" }))
    asMock(prisma.user.findUnique).mockResolvedValue({
      uploadLimitSeconds: 100,
      uploadSecondsUsed: 100,
    })
    asMock(prisma.transcription.create).mockResolvedValue({ id: "tr-3" })

    const result = await saveTranscription({ title: "t", sourceType: "audio", segments: baseSegments })

    // remaining is 0, but duration 0 is not > 0 and not <= 0 is false... remaining<=0 triggers exhausted first.
    expect(result).toEqual({ ok: false, reason: "exhausted" })
  })
})

describe("getTranscriptions / getTranscription", () => {
  it("getTranscriptions throws Unauthorized without a session", async () => {
    asMock(auth).mockResolvedValue(null)
    await expect(getTranscriptions()).rejects.toThrow("Unauthorized")
  })

  it("getTranscription throws Unauthorized without a session", async () => {
    asMock(auth).mockResolvedValue(null)
    await expect(getTranscription("id")).rejects.toThrow("Unauthorized")
  })

  it("getTranscriptions scopes the query to the signed-in user", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findMany).mockResolvedValue([{ id: "tr-1" }])

    const result = await getTranscriptions()

    expect(result).toEqual([{ id: "tr-1" }])
    expect(prisma.transcription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    )
  })
})

describe("deleteTranscription", () => {
  it("throws Unauthorized without a session", async () => {
    asMock(auth).mockResolvedValue(null)
    await expect(deleteTranscription("id")).rejects.toThrow("Unauthorized")
  })

  it("throws Not found when the row doesn't belong to the user", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findFirst).mockResolvedValue(null)

    await expect(deleteTranscription("id")).rejects.toThrow("Not found")
    expect(prisma.transcription.delete).not.toHaveBeenCalled()
  })

  it("skips the storage-delete fetch when there is no sourceKey", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findFirst).mockResolvedValue({ sourceKey: null })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "secret")

    await expect(deleteTranscription("id")).rejects.toThrow("NEXT_REDIRECT:/dashboard")

    expect(fetch).not.toHaveBeenCalled()
    expect(prisma.transcription.delete).toHaveBeenCalledWith({ where: { id: "id" } })
  })

  it("skips the storage-delete fetch when API_URL is unset", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findFirst).mockResolvedValue({ sourceKey: "videos/a.mp4" })
    vi.stubEnv("API_URL", "")

    await expect(deleteTranscription("id")).rejects.toThrow("NEXT_REDIRECT:/dashboard")

    expect(fetch).not.toHaveBeenCalled()
  })

  it("calls the backend storage delete with the internal key header when sourceKey + API_URL are set", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findFirst).mockResolvedValue({ sourceKey: "videos/a.mp4" })
    vi.stubEnv("API_URL", "http://backend")
    vi.stubEnv("INTERNAL_API_KEY", "secret")
    asMock(fetch).mockResolvedValue(new Response("{}"))

    await expect(deleteTranscription("id")).rejects.toThrow("NEXT_REDIRECT:/dashboard")

    expect(fetch).toHaveBeenCalledWith(
      "http://backend/storage?key=videos%2Fa.mp4",
      expect.objectContaining({
        method: "DELETE",
        headers: { "X-Internal-Key": "secret" },
      }),
    )
    expect(prisma.transcription.delete).toHaveBeenCalledWith({ where: { id: "id" } })
  })

  it("still deletes the row and redirects even if the storage fetch rejects", async () => {
    asMock(auth).mockResolvedValue(fakeSession({ id: "u1" }))
    asMock(prisma.transcription.findFirst).mockResolvedValue({ sourceKey: "videos/a.mp4" })
    vi.stubEnv("API_URL", "http://backend")
    asMock(fetch).mockRejectedValue(new Error("network down"))

    await expect(deleteTranscription("id")).rejects.toThrow("NEXT_REDIRECT:/dashboard")

    expect(prisma.transcription.delete).toHaveBeenCalledWith({ where: { id: "id" } })
  })
})
