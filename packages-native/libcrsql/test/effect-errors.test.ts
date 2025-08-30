import { afterEach, describe, expect, it, vi } from "@effect/vitest"
import { Effect } from "effect"
import { getCrSqliteExtensionPath, PlatformNotSupportedError } from "../src/effect.js"
import * as platform from "../src/platform.js"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("effect API error paths", () => {
  it.effect("fails with PlatformNotSupportedError when detection yields unsupported", () =>
    Effect.gen(function*() {
      vi.spyOn(platform, "detectPlatform").mockReturnValue("freebsd-x64")
      const error = yield* getCrSqliteExtensionPath().pipe(Effect.flip)
      expect(error).toBeInstanceOf(PlatformNotSupportedError)
      expect((error as PlatformNotSupportedError).platform).toBe("freebsd-x64")
    }))
  // missing binary case covered in effect-missing-binary.test.ts where fs is mocked before import
})
