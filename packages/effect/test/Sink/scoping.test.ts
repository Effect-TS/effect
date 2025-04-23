import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("unwrapScoped - happy path", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const resource = Effect.acquireRelease(
        Effect.succeed(100),
        () => Ref.set(ref, true)
      )
      const sink = pipe(
        resource,
        Effect.map((n) =>
          pipe(
            Sink.count,
            Sink.mapEffect((count) =>
              pipe(
                Ref.get(ref),
                Effect.map((closed) => [count + n, closed] as const)
              )
            )
          )
        ),
        Sink.unwrapScoped
      )
      const [result, state] = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink))
      const finalState = yield* (Ref.get(ref))
      strictEqual(result, 103)
      assertFalse(state)
      assertTrue(finalState)
    }))

  it.effect("unwrapScoped - error", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const resource = Effect.acquireRelease(
        Effect.succeed(100),
        () => Ref.set(ref, true)
      )
      const sink = pipe(resource, Effect.as(Sink.succeed("ok")), Sink.unwrapScoped)
      const result = yield* pipe(Stream.fail("fail"), Stream.run(sink))
      const finalState = yield* (Ref.get(ref))
      strictEqual(result, "ok")
      assertTrue(finalState)
    }))
})
