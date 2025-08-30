import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { vi } from "vitest"

// Mock fs before importing the module under test
vi.mock("node:fs", async () => {
  const actual = await vi.importActual("node:fs")
  return {
    ...actual,
    accessSync: () => {
      throw new Error("ENOENT")
    }
  }
})

describe("effect API missing binary", () => {
  it.effect("fails with ExtensionNotFoundError when binary is missing (fs mocked)", () =>
    Effect.gen(function*() {
      const platform = yield* Effect.promise(() => import("../src/platform.js"))
      const { ExtensionNotFoundError, getCrSqliteExtensionPath } = yield* Effect.promise(() =>
        import("../src/effect.js")
      )
      vi.spyOn(platform, "detectPlatform").mockReturnValue("linux-x86_64")
      const error = yield* getCrSqliteExtensionPath().pipe(Effect.flip)
      expect(error).toBeInstanceOf(ExtensionNotFoundError)
    }))
})
