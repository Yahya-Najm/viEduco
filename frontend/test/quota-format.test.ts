import { describe, expect, it } from "vitest"
import { formatMinutes } from "@/lib/quota"

describe("formatMinutes", () => {
  it("formats zero seconds", () => {
    expect(formatMinutes(0)).toBe("0 min")
  })

  it("formats an exact whole number of minutes without decimals", () => {
    expect(formatMinutes(300)).toBe("5 min")
  })

  it("formats a fractional number of minutes with one decimal place", () => {
    expect(formatMinutes(330)).toBe("5.5 min")
    expect(formatMinutes(90)).toBe("1.5 min")
  })

  it("rounds sub-minute durations down to 0.0 min", () => {
    // 1s / 60 = 0.0166... -> toFixed(1) => "0.0"
    expect(formatMinutes(1)).toBe("0.0 min")
  })

  it("formats large durations", () => {
    expect(formatMinutes(7200)).toBe("120 min")
  })

  it("formats negative durations as a negative whole number (documented current behavior)", () => {
    expect(formatMinutes(-60)).toBe("-1 min")
  })
})
