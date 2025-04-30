import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { constTrue, pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("peel", () =>
    Effect.gen(function*() {
      const sink = Sink.take<number>(3)
      const [peeled, rest] = yield* pipe(
        Stream.fromChunks(Chunk.range(1, 3), Chunk.range(4, 6)),
        Stream.peel(sink),
        Effect.flatMap(([peeled, rest]) =>
          pipe(
            Stream.runCollect(rest),
            Effect.map((rest) => [peeled, rest])
          )
        ),
        Effect.scoped
      )
      deepStrictEqual(Array.from(peeled), [1, 2, 3])
      deepStrictEqual(Array.from(rest), [4, 5, 6])
    }))

  it.effect("peel - propagates errors", () =>
    Effect.gen(function*() {
      const stream = Stream.repeatEffect(Effect.fail("fail"))
      const sink = Sink.fold<Chunk.Chunk<number>, number>(
        Chunk.empty(),
        constTrue,
        Chunk.append
      )
      const result = yield* pipe(
        stream,
        Stream.peel(sink),
        Effect.exit,
        Effect.scoped
      )
      deepStrictEqual(result, Exit.fail("fail"))
    }))
})
