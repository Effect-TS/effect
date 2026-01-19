import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as SourceLocation from "effect/SourceLocation"
import { expect } from "vitest"

describe("SourceLocation", () => {
  describe("make", () => {
    it("creates a SourceLocation with required fields", () => {
      const location = SourceLocation.make("src/test.ts", 42, 12)
      expect(location.path).toBe("src/test.ts")
      expect(location.line).toBe(42)
      expect(location.column).toBe(12)
      expect(location.label).toBeUndefined()
    })

    it("creates a SourceLocation with optional label", () => {
      const location = SourceLocation.make("src/test.ts", 42, 12, "fetchUser")
      expect(location.path).toBe("src/test.ts")
      expect(location.line).toBe(42)
      expect(location.column).toBe(12)
      expect(location.label).toBe("fetchUser")
    })
  })

  describe("format", () => {
    it("formats location without label", () => {
      const location = SourceLocation.make("src/test.ts", 42, 12)
      expect(SourceLocation.format(location)).toBe("src/test.ts:42")
    })

    it("formats location with label", () => {
      const location = SourceLocation.make("src/test.ts", 42, 12, "fetchUser")
      expect(SourceLocation.format(location)).toBe("src/test.ts:42 (fetchUser)")
    })
  })

  describe("isSourceLocation", () => {
    it("returns true for valid SourceLocation", () => {
      const location = SourceLocation.make("src/test.ts", 42, 12)
      expect(SourceLocation.isSourceLocation(location)).toBe(true)
    })

    it("returns false for non-SourceLocation objects", () => {
      expect(SourceLocation.isSourceLocation({})).toBe(false)
      expect(SourceLocation.isSourceLocation(null)).toBe(false)
      expect(SourceLocation.isSourceLocation(undefined)).toBe(false)
      expect(SourceLocation.isSourceLocation("string")).toBe(false)
      expect(SourceLocation.isSourceLocation({ path: "test.ts", line: 1, column: 0 })).toBe(false)
    })
  })

  describe("currentSourceTrace FiberRef", () => {
    it.effect("has undefined as initial value", () =>
      Effect.gen(function*() {
        const trace = yield* FiberRef.get(FiberRef.currentSourceTrace)
        expect(trace).toBeUndefined()
      }))

    it.effect("can be set and read", () =>
      Effect.gen(function*() {
        const location = SourceLocation.make("src/test.ts", 42, 12, "test")

        yield* FiberRef.set(FiberRef.currentSourceTrace, location)
        const trace = yield* FiberRef.get(FiberRef.currentSourceTrace)

        expect(trace).toEqual(location)
      }))

    it.effect("is scoped with locally", () =>
      Effect.gen(function*() {
        const location = SourceLocation.make("src/test.ts", 42, 12, "test")

        // Outer scope should be undefined
        const outer1 = yield* FiberRef.get(FiberRef.currentSourceTrace)
        expect(outer1).toBeUndefined()

        // Inner scope should have the location
        yield* Effect.locally(
          Effect.gen(function*() {
            const inner = yield* FiberRef.get(FiberRef.currentSourceTrace)
            expect(inner).toEqual(location)
          }),
          FiberRef.currentSourceTrace,
          location
        )

        // Outer scope should still be undefined
        const outer2 = yield* FiberRef.get(FiberRef.currentSourceTrace)
        expect(outer2).toBeUndefined()
      }))
  })
})
