import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("ensuring - happy path", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      yield* pipe(
        Stream.make(1, 2, 3, 4, 5),
        Stream.run(pipe(Sink.drain, Sink.ensuring(Ref.set(ref, true))))
      )
      const result = yield* Ref.get(ref)
      assertTrue(result)
    }))

  it.effect("ensuring - error", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      yield* pipe(
        Stream.fail("boom!"),
        Stream.run(pipe(Sink.drain, Sink.ensuring(Ref.set(ref, true)))),
        Effect.ignore
      )
      const result = yield* Ref.get(ref)
      assertTrue(result)
    }))
})
