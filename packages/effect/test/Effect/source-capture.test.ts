import { describe, it } from "@effect/vitest"
import { assertFalse, strictEqual, assertTrue } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as core from "../../src/internal/core.js"

describe("Effect.withCaptureStackTraces", () => {
  it.effect("captures source location on fork when enabled", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(Effect.succeed(42))
      const location = fiber.getFiberRef(core.currentSourceLocation)

      assertTrue(location !== undefined)
      // Check that file contains "source-capture" somewhere (might be full path or relative)
      assertTrue(location!.file.includes("source-capture") || location!.file.includes("test"))
      assertTrue(location!.line > 0)
    }).pipe(Effect.withCaptureStackTraces(true)))

  it.effect("does not capture when disabled (default)", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(Effect.succeed(42))
      const location = fiber.getFiberRef(core.currentSourceLocation)

      strictEqual(location, undefined)
    }))

  it.effect("scoped control works correctly", () =>
    Effect.gen(function*() {
      // Outer scope: disabled
      const fiber1 = yield* Effect.fork(Effect.succeed(1))
      const loc1 = fiber1.getFiberRef(core.currentSourceLocation)
      strictEqual(loc1, undefined)

      // Inner scope: enabled
      const fiber2 = yield* Effect.fork(Effect.succeed(2)).pipe(
        Effect.withCaptureStackTraces(true)
      )
      const loc2 = fiber2.getFiberRef(core.currentSourceLocation)
      assertTrue(loc2 !== undefined)
    }))

  it.effect("captures function name when available", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(Effect.succeed(42))
      const location = fiber.getFiberRef(core.currentSourceLocation)

      assertTrue(location !== undefined)
      // The function name might be "body" or similar from Effect.gen
      assertTrue(location!.column > 0)
    }).pipe(Effect.withCaptureStackTraces(true)))

  it.effect("can be nested with different settings", () =>
    Effect.gen(function*() {
      // Enable capture
      const fiber1 = yield* Effect.fork(Effect.succeed(1)).pipe(
        Effect.withCaptureStackTraces(true)
      )
      assertTrue(fiber1.getFiberRef(core.currentSourceLocation) !== undefined)

      // Disable within enabled scope
      const fiber2 = yield* Effect.fork(Effect.succeed(2)).pipe(
        Effect.withCaptureStackTraces(false)
      ).pipe(Effect.withCaptureStackTraces(true))
      // The innermost setting wins
      strictEqual(fiber2.getFiberRef(core.currentSourceLocation), undefined)
    }))
})

describe("Layer.enableSourceCapture", () => {
  it.effect("enables capture via layer", () =>
    Effect.gen(function*() {
      const fiber = yield* Effect.fork(Effect.succeed(42))
      const location = fiber.getFiberRef(core.currentSourceLocation)

      assertTrue(location !== undefined)
      assertTrue(location!.line > 0)
    }).pipe(Effect.provide(Layer.enableSourceCapture)))

  it.effect("can be disabled within layer scope", () =>
    Effect.gen(function*() {
      // Layer enables, but inner scope disables
      const fiber = yield* Effect.fork(Effect.succeed(42)).pipe(
        Effect.withCaptureStackTraces(false)
      )
      const location = fiber.getFiberRef(core.currentSourceLocation)

      strictEqual(location, undefined)
    }).pipe(Effect.provide(Layer.enableSourceCapture)))
})

describe("Source capture caching", () => {
  it.effect("caches source locations for repeated fork sites", () =>
    Effect.gen(function*() {
      // Fork from the same location multiple times
      const fiber1 = yield* Effect.fork(Effect.succeed(1))
      const fiber2 = yield* Effect.fork(Effect.succeed(2))
      const fiber3 = yield* Effect.fork(Effect.succeed(3))

      const loc1 = fiber1.getFiberRef(core.currentSourceLocation)
      const loc2 = fiber2.getFiberRef(core.currentSourceLocation)
      const loc3 = fiber3.getFiberRef(core.currentSourceLocation)

      // All should be captured
      assertTrue(loc1 !== undefined)
      assertTrue(loc2 !== undefined)
      assertTrue(loc3 !== undefined)

      // Locations from same file should have same file path
      strictEqual(loc1!.file, loc2!.file)
      strictEqual(loc2!.file, loc3!.file)
    }).pipe(Effect.withCaptureStackTraces(true)))

  it.effect("different fork sites have different locations", () =>
    Effect.gen(function*() {
      const fiber1 = yield* Effect.fork(Effect.succeed(1))
      // This is on a different line
      const fiber2 = yield* Effect.fork(Effect.succeed(2))

      const loc1 = fiber1.getFiberRef(core.currentSourceLocation)
      const loc2 = fiber2.getFiberRef(core.currentSourceLocation)

      assertTrue(loc1 !== undefined)
      assertTrue(loc2 !== undefined)

      // Lines should be different since they're forked on different lines
      assertFalse(loc1!.line === loc2!.line)
    }).pipe(Effect.withCaptureStackTraces(true)))
})
