import { Effect, Sink, Stream } from "effect"
import * as it from "effect-test/utils/extend"
import { pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("filterInput", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.collectAll<number>(), Sink.filterInput((n) => n % 2 === 0)))
      )
      assert.deepStrictEqual(Array.from(result), [2, 4, 6, 8])
    }))

  it.effect("filterInputEffect - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(
          Sink.collectAll<number>(),
          Sink.filterInputEffect((n) => Effect.succeed(n % 2 === 0))
        ))
      )
      assert.deepStrictEqual(Array.from(result), [2, 4, 6, 8])
    }))

  it.effect("filterInputEffect - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(
          Sink.collectAll<number>(),
          Sink.filterInputEffect(() => Effect.fail("fail"))
        )),
        Effect.flip
      )
      assert.strictEqual(result, "fail")
    }))
})
