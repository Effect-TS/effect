import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("ensuring - happy path", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      yield* $(
        Stream.make(1, 2, 3, 4, 5),
        Stream.run(pipe(Sink.drain, Sink.ensuring(Ref.set(ref, true))))
      )
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("ensuring - error", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      yield* $(
        Stream.fail("boom!"),
        Stream.run(pipe(Sink.drain, Sink.ensuring(Ref.set(ref, true)))),
        Effect.ignore
      )
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))
})
