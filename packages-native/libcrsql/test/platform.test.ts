import { describe, expect, it } from "@effect/vitest"
import { buildRelativeLibraryPath, isSupportedPlatform, SUPPORTED_PLATFORMS } from "../src/platform.js"

describe("platform helpers", () => {
  it("supported set contains expected values", () => {
    for (const p of SUPPORTED_PLATFORMS) {
      expect(isSupportedPlatform(p)).toBe(true)
    }
    expect(isSupportedPlatform("freebsd-x64")).toBe(false)
  })

  it("buildRelativeLibraryPath returns correct filenames", () => {
    expect(buildRelativeLibraryPath("darwin-aarch64")).toMatch(/lib\/darwin-aarch64\/libcrsqlite\.dylib$/)
    expect(buildRelativeLibraryPath("darwin-x86_64")).toMatch(/lib\/darwin-x86_64\/libcrsqlite\.dylib$/)
    expect(buildRelativeLibraryPath("linux-aarch64")).toMatch(/lib\/linux-aarch64\/libcrsqlite\.so$/)
    expect(buildRelativeLibraryPath("linux-x86_64")).toMatch(/lib\/linux-x86_64\/libcrsqlite\.so$/)
    expect(buildRelativeLibraryPath("win-x86_64")).toMatch(/lib\/win-x86_64\/crsqlite\.dll$/)
    expect(buildRelativeLibraryPath("win-i686")).toMatch(/lib\/win-i686\/crsqlite\.dll$/)
  })
})
