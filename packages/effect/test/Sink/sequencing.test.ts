import { describe, it } from "@effect/vitest"
import { assertNone, assertSome, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("flatMap - empty input", () =>
    Effect.gen(function*() {
      const sink = pipe(Sink.head<number>(), Sink.flatMap(Sink.succeed))
      const result = yield* pipe(Stream.empty, Stream.run(sink))
      assertNone(result)
    }))

  it.effect("flatMap - non-empty input", () =>
    Effect.gen(function*() {
      const sink = pipe(Sink.head<number>(), Sink.flatMap(Sink.succeed))
      const result = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink))
      assertSome(result, 1)
    }))

  it.effect("flatMap - with leftovers", () =>
    Effect.gen(function*() {
      const chunks = Chunk.make(
        Chunk.make(1, 2),
        Chunk.make(3, 4, 5),
        Chunk.empty<number>(),
        Chunk.make(7, 8, 9, 10)
      )
      const sink = pipe(
        Sink.head<number>(),
        Sink.flatMap((head) =>
          pipe(
            Sink.count,
            Sink.map((count) => [head, count] as const)
          )
        )
      )
      const [option, count] = yield* pipe(Stream.fromChunks(...chunks), Stream.run(sink))
      deepStrictEqual(option, Chunk.head(Chunk.flatten(chunks)))
      strictEqual(
        count + Option.match(option, {
          onNone: () => 0,
          onSome: () => 1
        }),
        pipe(chunks, Chunk.map(Chunk.size), Chunk.reduce(0, (a, b) => a + b))
      )
    }))
})
