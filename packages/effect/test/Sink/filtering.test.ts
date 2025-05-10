import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("filterInput", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.collectAll<number>(), Sink.filterInput((n) => n % 2 === 0)))
      )
      deepStrictEqual(Array.from(result), [2, 4, 6, 8])
    }))

  it.effect("filterInputEffect - happy path", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(pipe(
          Sink.collectAll<number>(),
          Sink.filterInputEffect((n) => Effect.succeed(n % 2 === 0))
        ))
      )
      deepStrictEqual(Array.from(result), [2, 4, 6, 8])
    }))

  it.effect("filterInputEffect - error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(1, 9),
        Stream.run(pipe(
          Sink.collectAll<number>(),
          Sink.filterInputEffect(() => Effect.fail("fail"))
        )),
        Effect.flip
      )
      strictEqual(result, "fail")
    }))
})
