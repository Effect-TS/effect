import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { constTrue, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("collectAllN - respects the given limit", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.fromChunk(Chunk.make(1, 2, 3, 4)),
        Stream.transduce(Sink.collectAllN<number>(3))
      )
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[1, 2, 3], [4]]
      )
    }))

  it.effect("collectAllN - produces empty trailing chunks", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.fromChunk(Chunk.make(1, 2, 3, 4)),
        Stream.transduce(Sink.collectAllN<number>(4))
      )
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[1, 2, 3, 4], []]
      )
    }))

  it.effect("collectAllN - produces empty trailing chunks", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.fromChunk(Chunk.empty<number>()),
        Stream.transduce(Sink.collectAllN<number>(3))
      )
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[]]
      )
    }))

  it.effect("collectAllToSet", () =>
    Effect.gen(function*() {
      const stream = Stream.make(1, 2, 3, 3, 4)
      const result = yield* pipe(stream, Stream.run(Sink.collectAllToSet()))
      deepStrictEqual(Array.from(result), [1, 2, 3, 4])
    }))

  it.effect("collectAllToSetN - respects the given limit", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.fromChunks(Chunk.make(1, 2, 1), Chunk.make(2, 3, 3, 4)),
        Stream.transduce(Sink.collectAllToSetN<number>(3))
      )
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(Chunk.map(result, (set) => Array.from(set))),
        [[1, 2, 3], [4]]
      )
    }))

  it.effect("collectAllToSetN - handles empty input", () =>
    Effect.gen(function*() {
      const stream = pipe(
        Stream.fromChunk(Chunk.empty<number>()),
        Stream.transduce(Sink.collectAllToSetN<number>(3))
      )
      const result = yield* (Stream.runCollect(stream))
      deepStrictEqual(
        Array.from(Chunk.map(result, (set) => Array.from(set))),
        [[]]
      )
    }))

  it.effect("collectAllToMap", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(0, 9),
        Stream.run(Sink.collectAllToMap(
          (n) => n % 3,
          (x, y) => x + y
        ))
      )
      deepStrictEqual(
        Array.from(result),
        [[0, 18], [1, 12], [2, 15]]
      )
    }))

  it.effect("collectAllToMapN - respects the given limit", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 2, 2, 3, 2, 4, 5),
        Stream.transduce(Sink.collectAllToMapN(
          2,
          (n) => n % 3,
          (x, y) => x + y
        )),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[[1, 2], [2, 4]], [[0, 3], [2, 2]], [[1, 4], [2, 5]]]
      )
    }))

  it.effect("collectAllToMapN - collects as long as map size doesn't exceed the limit", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunks(Chunk.make(0, 1, 2), Chunk.make(3, 4, 5), Chunk.make(6, 7, 8, 9)),
        Stream.transduce(Sink.collectAllToMapN(
          3,
          (n) => n % 3,
          (x, y) => x + y
        )),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[[0, 18], [1, 12], [2, 15]]]
      )
    }))

  it.effect("collectAllToMapN - handles empty input", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromChunk(Chunk.empty<number>()),
        Stream.transduce(Sink.collectAllToMapN(
          3,
          (n) => n % 3,
          (x, y) => x + y
        )),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(Chunk.map(result, (chunk) => Array.from(chunk))),
        [[]]
      )
    }))

  it.effect("collectAllUntil", () =>
    Effect.gen(function*() {
      const sink = Sink.collectAllUntil<number>((n) => n > 4)
      const input = Chunk.make(
        Chunk.make(3, 4, 5, 6, 7, 2),
        Chunk.empty<number>(),
        Chunk.make(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty<number>()
      )
      const result = yield* pipe(Stream.fromChunks(...input), Stream.transduce(sink), Stream.runCollect)
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[3, 4, 5], [6], [7], [2, 3, 4, 5], [6], [5], [4, 3, 2]]
      )
    }))

  it.effect("collectAllUntilEffect", () =>
    Effect.gen(function*() {
      const sink = Sink.collectAllUntilEffect((n: number) => Effect.succeed(n > 4))
      const input = Chunk.make(
        Chunk.make(3, 4, 5, 6, 7, 2),
        Chunk.empty<number>(),
        Chunk.make(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty<number>()
      )
      const result = yield* pipe(Stream.fromChunks(...input), Stream.transduce(sink), Stream.runCollect)
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[3, 4, 5], [6], [7], [2, 3, 4, 5], [6], [5], [4, 3, 2]]
      )
    }))

  it.effect("collectAllWhile", () =>
    Effect.gen(function*() {
      const sink = pipe(
        Sink.collectAllWhile<number>((n) => n < 5),
        Sink.zipLeft(Sink.collectAllWhile<number>((n) => n >= 5))
      )
      const input = Chunk.make(
        Chunk.make(3, 4, 5, 6, 7, 2),
        Chunk.empty<number>(),
        Chunk.make(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty<number>()
      )
      const result = yield* pipe(Stream.fromChunks(...input), Stream.transduce(sink), Stream.runCollect)
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[3, 4], [2, 3, 4], [4, 3, 2]]
      )
    }))

  it.effect("collectAllWhileEffect", () =>
    Effect.gen(function*() {
      const sink = pipe(
        Sink.collectAllWhileEffect((n: number) => Effect.succeed(n < 5)),
        Sink.zipLeft(Sink.collectAllWhileEffect((n: number) => Effect.succeed(n >= 5)))
      )
      const input = Chunk.make(
        Chunk.make(3, 4, 5, 6, 7, 2),
        Chunk.empty<number>(),
        Chunk.make(3, 4, 5, 6, 5, 4, 3, 2),
        Chunk.empty<number>()
      )
      const result = yield* pipe(Stream.fromChunks(...input), Stream.transduce(sink), Stream.runCollect)
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[3, 4], [2, 3, 4], [4, 3, 2]]
      )
    }))

  it.effect("collectAllWhileWith - example 1", () =>
    Effect.gen(function*() {
      const program = (chunkSize: number) =>
        pipe(
          Stream.fromChunk(Chunk.range(1, 10)),
          Stream.rechunk(chunkSize),
          Stream.run(pipe(
            Sink.sum,
            Sink.collectAllWhileWith({
              initial: -1,
              while: (n) => n === n,
              body: (acc, curr) => acc + curr
            })
          ))
        )
      const result1 = yield* (program(1))
      const result2 = yield* (program(3))
      const result3 = yield* (program(20))
      strictEqual(result1, 54)
      strictEqual(result2, 54)
      strictEqual(result3, 54)
    }))

  it.effect("collectAllWhileWith - example 2", () =>
    Effect.gen(function*() {
      const sink = pipe(
        Sink.head<number>(),
        Sink.collectAllWhileWith({
          initial: Chunk.empty<number>(),
          while: Option.match({
            onNone: constTrue,
            onSome: (n) => n < 5
          }),
          body: (acc, option) => Option.isSome(option) ? pipe(acc, Chunk.append(option.value)) : acc
        })
      )
      const stream = Stream.fromChunk(Chunk.range(1, 100))
      const result = yield* pipe(
        stream,
        Stream.concat(stream),
        Stream.rechunk(3),
        Stream.run(sink)
      )
      deepStrictEqual(Array.from(result), [1, 2, 3, 4])
    }))
})
