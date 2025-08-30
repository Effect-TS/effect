import { expect, it, vi } from "@effect/vitest"
import * as Effect from "effect/Effect"

it.effect("maps thrown error to PlatformNotSupportedError with friendly help", () =>
  Effect.gen(function*() {
    vi.resetModules()
    vi.doMock("../src/index", () => ({
      getLibSqlitePathSync: () => {
        throw new Error("Linux musl detected; v1 supports glibc only.")
      }
    }))
    const { getLibSqlitePath } = yield* Effect.promise(() => import("../src/effect"))
    const exit = yield* Effect.exit(getLibSqlitePath)
    if (exit._tag !== "Failure") {
      throw new Error("expected failure")
    }
    // @ts-expect-error private
    expect(exit.cause._tag === "Fail").toBe(true)
    // Safely inspect cause shape without type assertions
    const cause = (exit as unknown as { cause?: unknown }).cause
    if (typeof cause !== "object" || cause === null || !("_tag" in cause)) {
      throw new Error("unexpected cause shape")
    }
    const tagged = cause as { _tag: string }
    expect(tagged._tag).toBe("Fail")
    const maybeError = (cause as any).error
    if (typeof maybeError !== "object" || maybeError === null || !("_tag" in maybeError)) {
      throw new Error("unexpected error shape")
    }
    const err = maybeError as { _tag: string; help?: unknown }
    expect(err._tag).toBe("PlatformNotSupportedError")
    expect(typeof err.help === "string" && (err.help as string).includes("If you'd like support")).toBe(true)
  }))
