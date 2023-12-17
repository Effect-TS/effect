import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe("Sink", () => {
  it.effect("as", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.succeed(1), Sink.as("as")))
      )
      assert.strictEqual(result, "as")
    }))

  it.effect("mapInput - happy path", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInput((input: string) => Number.parseInt(input))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("mapInput - error", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.fail("Ouch"),
        Sink.mapInput((input: string) => Number.parseInt(input))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink), Effect.either)
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("mapInputChunks - happy path", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInputChunks<string, number>(Chunk.map((_) => Number.parseInt(_)))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("mapInputChunks - error", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.fail("Ouch"),
        Sink.mapInputChunks<string, number>(Chunk.map(Number.parseInt))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink), Effect.either)
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("mapInputEffect - happy path", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInputEffect((s: string) => Effect.try(() => Number.parseInt(s)))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("mapInputEffect - error", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.fail("Ouch"),
        Sink.mapInputEffect((s: string) => Effect.try(() => Number.parseInt(s)))
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink), Effect.either)
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("mapInputEffect - error in transformation", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInputEffect((s: string) =>
          Effect.try(() => {
            const result = Number.parseInt(s)
            if (Number.isNaN(result)) {
              throw new Cause.RuntimeException(`Cannot parse "${s}" to an integer`)
            }
            return result
          })
        )
      )
      const result = yield* $(Stream.make("1", "a"), Stream.run(sink), Effect.flip)
      assert.deepStrictEqual(result.error, new Cause.RuntimeException("Cannot parse \"a\" to an integer"))
    }))

  it.effect("mapInputChunksEffect - happy path", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInputChunksEffect((chunk: Chunk.Chunk<string>) =>
          pipe(
            chunk,
            Effect.forEach((s) => Effect.try(() => Number.parseInt(s))),
            Effect.map(Chunk.unsafeFromArray)
          )
        )
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("mapInputChunksEffect - error", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.fail("Ouch"),
        Sink.mapInputChunksEffect((chunk: Chunk.Chunk<string>) =>
          pipe(
            chunk,
            Effect.forEach((s) => Effect.try(() => Number.parseInt(s))),
            Effect.map(Chunk.unsafeFromArray)
          )
        )
      )
      const result = yield* $(Stream.make("1", "2", "3"), Stream.run(sink), Effect.either)
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))

  it.effect("mapInputChunksEffect - error in transformation", () =>
    Effect.gen(function*($) {
      const sink = pipe(
        Sink.collectAll<number>(),
        Sink.mapInputChunksEffect((chunk: Chunk.Chunk<string>) =>
          pipe(
            chunk,
            Effect.forEach((s) =>
              Effect.try(() => {
                const result = Number.parseInt(s)
                if (Number.isNaN(result)) {
                  throw new Cause.RuntimeException(`Cannot parse "${s}" to an integer`)
                }
                return result
              })
            ),
            Effect.map(Chunk.unsafeFromArray)
          )
        )
      )
      const result = yield* $(Stream.make("1", "a"), Stream.run(sink), Effect.flip)
      assert.deepStrictEqual(result.error, new Cause.RuntimeException("Cannot parse \"a\" to an integer"))
    }))

  it.effect("map", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.succeed(1), Sink.map((n) => `${n}`)))
      )
      assert.strictEqual(result, "1")
    }))

  it.effect("mapEffect - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.succeed(1), Sink.mapEffect((n) => Effect.succeed(n + 1))))
      )
      assert.strictEqual(result, 2)
    }))

  it.effect("mapEffect - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.succeed(1), Sink.mapEffect(() => Effect.fail("fail")))),
        Effect.flip
      )
      assert.strictEqual(result, "fail")
    }))

  it.effect("mapError", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(1, 9),
        Stream.run(pipe(Sink.fail("fail"), Sink.mapError((s) => s + "!"))),
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail!"))
    }))
})
