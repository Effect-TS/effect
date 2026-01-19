import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import * as SourceLocation from "effect/SourceLocation"
import { expect } from "vitest"

describe("Effect.gen source trace", () => {
  describe("trace propagation via Effect.locally", () => {
    it.effect("trace is scoped to the wrapped effect", () =>
      Effect.gen(function*() {
        const location1 = SourceLocation.make("src/a.ts", 10, 0, "first")
        const location2 = SourceLocation.make("src/b.ts", 20, 0, "second")

        const traces: Array<SourceLocation.SourceLocation | undefined> = []

        // Capture trace before
        traces.push(yield* FiberRef.get(FiberRef.currentSourceTrace))

        // First traced effect - using Effect.locally like genAdapter does
        yield* Effect.locally(
          Effect.gen(function*() {
            traces.push(yield* FiberRef.get(FiberRef.currentSourceTrace))
          }),
          FiberRef.currentSourceTrace,
          location1
        )

        // Capture trace between
        traces.push(yield* FiberRef.get(FiberRef.currentSourceTrace))

        // Second traced effect
        yield* Effect.locally(
          Effect.gen(function*() {
            traces.push(yield* FiberRef.get(FiberRef.currentSourceTrace))
          }),
          FiberRef.currentSourceTrace,
          location2
        )

        // Capture trace after
        traces.push(yield* FiberRef.get(FiberRef.currentSourceTrace))

        expect(traces).toEqual([
          undefined, // before first
          location1, // inside first
          undefined, // between
          location2, // inside second
          undefined // after second
        ])
      }))
  })

  describe("Effect.gen with adapter trace injection", () => {
    it.effect("adapter with trace sets currentSourceTrace during execution", () =>
      Effect.gen(function*(_) {
        // This simulates what the transformer would produce:
        // const answer = yield* _(Effect.succeed(42), trace)
        const trace = SourceLocation.make("src/test.ts", 5, 22, "answer")

        // Create an effect that checks the trace during execution
        const checkTrace = Effect.gen(function*() {
          const currentTrace = yield* FiberRef.get(FiberRef.currentSourceTrace)
          expect(currentTrace).toEqual(trace)
          return 42
        })

        // Use the adapter with trace - internally this uses Effect.locally
        const answer = yield* _(checkTrace, trace)

        expect(answer).toBe(42)

        // After completion, trace should be back to undefined
        const traceAfter = yield* FiberRef.get(FiberRef.currentSourceTrace)
        expect(traceAfter).toBeUndefined()
      }))

    it.effect("adapter without trace passes through effect unchanged", () =>
      Effect.gen(function*(_) {
        const result = yield* _(Effect.succeed(42))
        expect(result).toBe(42)

        // Source trace should be undefined
        const trace = yield* FiberRef.get(FiberRef.currentSourceTrace)
        expect(trace).toBeUndefined()
      }))
  })
})
