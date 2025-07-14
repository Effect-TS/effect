import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("buffer - maintains elements and ordering", () =>
    Effect.gen(function*() {
      const chunks = Chunk.make(
        Chunk.range(0, 3),
        Chunk.range(2, 5),
        Chunk.range(3, 7)
      )
      const result = yield* pipe(
        Stream.fromChunks(...chunks),
        Stream.buffer({ capacity: 2 }),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.flatten(chunks)))
    }))

  it.effect("buffer - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(0, 9),
        Stream.concat(Stream.fail(error)),
        Stream.buffer({ capacity: 2 }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("buffer - fast producer progresses independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch = yield* (Deferred.make<void>())
      const stream = pipe(
        Stream.range(1, 4),
        Stream.tap((n) =>
          pipe(
            Ref.update(ref, Chunk.append(n)),
            Effect.zipRight(pipe(
              Deferred.succeed(latch, void 0),
              Effect.when(() => n === 4)
            ))
          )
        ),
        Stream.buffer({ capacity: 2 })
      )
      const result1 = yield* pipe(stream, Stream.take(2), Stream.runCollect)
      yield* (Deferred.await(latch))
      const result2 = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result1), [1, 2])
      deepStrictEqual(Array.from(result2), [1, 2, 3, 4])
    }))

  it.effect("bufferChunks - maintains elements and ordering", () =>
    Effect.gen(function*() {
      const chunks = Chunk.make(
        Chunk.range(0, 3),
        Chunk.range(2, 5),
        Chunk.range(3, 7)
      )
      const result = yield* pipe(
        Stream.fromChunks(...chunks),
        Stream.bufferChunks({ capacity: 2 }),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(Chunk.flatten(chunks)))
    }))

  it.effect("bufferChunks - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(0, 9),
        Stream.concat(Stream.fail(error)),
        Stream.bufferChunks({ capacity: 2 }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferChunks - fast producer progresses independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch = yield* (Deferred.make<void>())
      const stream = pipe(
        Stream.range(1, 4),
        Stream.tap((n) =>
          pipe(
            Ref.update(ref, Chunk.append(n)),
            Effect.zipRight(pipe(
              Deferred.succeed(latch, void 0),
              Effect.when(() => n === 4)
            ))
          )
        ),
        Stream.bufferChunks({ capacity: 2 })
      )
      const result1 = yield* pipe(stream, Stream.take(2), Stream.runCollect)
      yield* (Deferred.await(latch))
      const result2 = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result1), [1, 2])
      deepStrictEqual(Array.from(result2), [1, 2, 3, 4])
    }))

  it.effect("bufferChunksDropping - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(1, 1_000),
        Stream.concat(Stream.fail(error)),
        Stream.concat(Stream.range(1_001, 2_000)),
        Stream.bufferChunks({ capacity: 2, strategy: "dropping" }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferChunksDropping - fast producer progress independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const latch3 = yield* (Deferred.make<void>())
      const latch4 = yield* (Deferred.make<void>())
      const stream1 = pipe(
        Stream.make(0),
        Stream.concat(
          pipe(
            Stream.fromEffect(Deferred.await(latch1)),
            Stream.flatMap(() =>
              pipe(
                Stream.range(1, 16),
                Stream.rechunk(1),
                Stream.ensuring(Deferred.succeed(latch2, void 0))
              )
            )
          )
        )
      )
      const stream2 = pipe(
        Stream.fromEffect(Deferred.await(latch3)),
        Stream.flatMap(() =>
          pipe(
            Stream.range(17, 24),
            Stream.rechunk(1),
            Stream.ensuring(Deferred.succeed(latch4, void 0))
          )
        )
      )
      const stream3 = Stream.make(-1)
      const stream = pipe(
        stream1,
        Stream.concat(stream2),
        Stream.concat(stream3),
        Stream.bufferChunks({ capacity: 8, strategy: "dropping" })
      )
      const { result1, result2, result3 } = yield* pipe(
        Stream.toPull(stream),
        Effect.flatMap((pull) =>
          Effect.gen(function*() {
            const result1 = yield* pull
            yield* (Deferred.succeed(latch1, void 0))
            yield* (Deferred.await(latch2))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result2 = yield* (Ref.get(ref))
            yield* (Deferred.succeed(latch3, void 0))
            yield* (Deferred.await(latch4))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result3 = yield* (Ref.get(ref))
            return { result1, result2, result3 }
          })
        ),
        Effect.scoped
      )
      const expected1 = [0]
      const expected2 = [1, 2, 3, 4, 5, 6, 7, 8]
      const expected3 = [1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23, 24]
      deepStrictEqual(Array.from(result1), expected1)
      deepStrictEqual(Array.from(result2), expected2)
      deepStrictEqual(Array.from(result3), expected3)
    }))

  it.effect("bufferChunksSliding - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(1, 1_000),
        Stream.concat(Stream.fail(error)),
        Stream.concat(Stream.range(1_001, 2_000)),
        Stream.bufferChunks({ capacity: 2, strategy: "sliding" }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferChunksSliding - fast producer progress independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const latch3 = yield* (Deferred.make<void>())
      const latch4 = yield* (Deferred.make<void>())
      const latch5 = yield* (Deferred.make<void>())
      const stream1 = pipe(
        Stream.make(0),
        Stream.concat(
          pipe(
            Stream.fromEffect(Deferred.await(latch1)),
            Stream.flatMap(() =>
              pipe(
                Stream.range(1, 16),
                Stream.rechunk(1),
                Stream.ensuring(Deferred.succeed(latch2, void 0))
              )
            )
          )
        )
      )
      const stream2 = pipe(
        Stream.fromEffect(Deferred.await(latch3)),
        Stream.flatMap(() =>
          pipe(
            Stream.range(17, 25),
            Stream.rechunk(1),
            Stream.ensuring(Deferred.succeed(latch4, void 0))
          )
        )
      )
      const stream3 = pipe(
        Stream.fromEffect(Deferred.await(latch5)),
        Stream.flatMap(() => Stream.make(-1))
      )
      const stream = pipe(
        stream1,
        Stream.concat(stream2),
        Stream.concat(stream3),
        Stream.bufferChunks({ capacity: 8, strategy: "sliding" })
      )
      const { result1, result2, result3 } = yield* pipe(
        Stream.toPull(stream),
        Effect.flatMap((pull) =>
          Effect.gen(function*() {
            const result1 = yield* pull
            yield* (Deferred.succeed(latch1, void 0))
            yield* (Deferred.await(latch2))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result2 = yield* (Ref.get(ref))
            yield* (Deferred.succeed(latch3, void 0))
            yield* (Deferred.await(latch4))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result3 = yield* (Ref.get(ref))
            return { result1, result2, result3 }
          })
        ),
        Effect.scoped
      )
      const expected1 = [0]
      const expected2 = [9, 10, 11, 12, 13, 14, 15, 16]
      const expected3 = [9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25]
      deepStrictEqual(Array.from(result1), expected1)
      deepStrictEqual(Array.from(result2), expected2)
      deepStrictEqual(Array.from(result3), expected3)
    }))

  it.effect("bufferDropping - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(1, 1_000),
        Stream.concat(Stream.fail(error)),
        Stream.concat(Stream.range(1_000, 2_000)),
        Stream.buffer({ capacity: 2, strategy: "dropping" }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferDropping - fast producer progress independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const latch3 = yield* (Deferred.make<void>())
      const latch4 = yield* (Deferred.make<void>())
      const stream1 = pipe(
        Stream.make(0),
        Stream.concat(
          pipe(
            Stream.fromEffect(Deferred.await(latch1)),
            Stream.flatMap(() =>
              pipe(
                Stream.range(1, 17),
                Stream.rechunk(1),
                Stream.ensuring(Deferred.succeed(latch2, void 0))
              )
            )
          )
        )
      )
      const stream2 = pipe(
        Stream.fromEffect(Deferred.await(latch3)),
        Stream.flatMap(() =>
          pipe(
            Stream.range(17, 24),
            Stream.rechunk(1),
            Stream.ensuring(Deferred.succeed(latch4, void 0))
          )
        )
      )
      const stream3 = Stream.make(-1)
      const stream = pipe(
        stream1,
        Stream.concat(stream2),
        Stream.concat(stream3),
        Stream.buffer({ capacity: 8, strategy: "dropping" })
      )
      const { result1, result2, result3 } = yield* pipe(
        Stream.toPull(stream),
        Effect.flatMap((pull) =>
          Effect.gen(function*() {
            const result1 = yield* pull
            yield* (Deferred.succeed(latch1, void 0))
            yield* (Deferred.await(latch2))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result2 = yield* (Ref.get(ref))
            yield* (Deferred.succeed(latch3, void 0))
            yield* (Deferred.await(latch4))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result3 = yield* (Ref.get(ref))
            return { result1, result2, result3 }
          })
        ),
        Effect.scoped
      )
      const expected1 = [0]
      const expected2 = [1, 2, 3, 4, 5, 6, 7, 8]
      const expected3 = [1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23, 24]
      deepStrictEqual(Array.from(result1), expected1)
      deepStrictEqual(Array.from(result2), expected2)
      deepStrictEqual(Array.from(result3), expected3)
    }))

  it.effect("bufferSliding - buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(1, 1_000),
        Stream.concat(Stream.fail(error)),
        Stream.concat(Stream.range(1_001, 2_000)),
        Stream.buffer({ capacity: 2, strategy: "sliding" }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferSliding - fast producer progress independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch1 = yield* (Deferred.make<void>())
      const latch2 = yield* (Deferred.make<void>())
      const latch3 = yield* (Deferred.make<void>())
      const latch4 = yield* (Deferred.make<void>())
      const stream1 = pipe(
        Stream.make(0),
        Stream.concat(
          pipe(
            Stream.fromEffect(Deferred.await(latch1)),
            Stream.flatMap(() =>
              pipe(
                Stream.range(1, 16),
                Stream.rechunk(1),
                Stream.ensuring(Deferred.succeed(latch2, void 0))
              )
            )
          )
        )
      )
      const stream2 = pipe(
        Stream.fromEffect(Deferred.await(latch3)),
        Stream.flatMap(() =>
          pipe(
            Stream.range(17, 24),
            Stream.rechunk(1),
            Stream.ensuring(Deferred.succeed(latch4, void 0))
          )
        )
      )
      const stream3 = Stream.make(-1)
      const stream = pipe(
        stream1,
        Stream.concat(stream2),
        Stream.concat(stream3),
        Stream.buffer({ capacity: 8, strategy: "sliding" })
      )
      const { result1, result2, result3 } = yield* pipe(
        Stream.toPull(stream),
        Effect.flatMap((pull) =>
          Effect.gen(function*() {
            const result1 = yield* pull
            yield* (Deferred.succeed(latch1, void 0))
            yield* (Deferred.await(latch2))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result2 = yield* (Ref.get(ref))
            yield* (Deferred.succeed(latch3, void 0))
            yield* (Deferred.await(latch4))
            yield* pipe(
              pull,
              Effect.flatMap((chunk) => Ref.update(ref, Chunk.appendAll(chunk))),
              Effect.repeatN(7)
            )
            const result3 = yield* (Ref.get(ref))
            return { result1, result2, result3 }
          })
        ),
        Effect.scoped
      )
      const expected1 = [0]
      const expected2 = [9, 10, 11, 12, 13, 14, 15, 16]
      const expected3 = [9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, -1]
      deepStrictEqual(Array.from(result1), expected1)
      deepStrictEqual(Array.from(result2), expected2)
      deepStrictEqual(Array.from(result3), expected3)
    }))

  it.effect("bufferSliding - propagates defects", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fromEffect(Effect.dieMessage("boom")),
        Stream.buffer({ capacity: 1, strategy: "sliding" }),
        Stream.runDrain,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("boom")))
    }))

  it.effect("bufferUnbounded - buffers the stream", () =>
    Effect.gen(function*() {
      const chunk = Chunk.range(0, 10)
      const result = yield* pipe(
        Stream.fromIterable(chunk),
        Stream.buffer({ capacity: "unbounded" }),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), Array.from(chunk))
    }))

  it.effect("bufferUnbounded -  buffers a stream with a failure", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(0, 9),
        Stream.concat(Stream.fail(error)),
        Stream.buffer({ capacity: "unbounded" }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("bufferUnbounded - fast producer progress independently", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(Chunk.empty<number>()))
      const latch = yield* (Deferred.make<void>())
      const stream = pipe(
        Stream.range(1, 999),
        Stream.tap((n) =>
          pipe(
            Ref.update(ref, Chunk.append(n)),
            Effect.zipRight(pipe(Deferred.succeed(latch, void 0), Effect.when(() => n === 999)))
          )
        ),
        Stream.rechunk(999),
        Stream.buffer({ capacity: "unbounded" })
      )
      const result1 = yield* pipe(stream, Stream.take(2), Stream.runCollect)
      yield* (Deferred.await(latch))
      const result2 = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(result1), [1, 2])
      deepStrictEqual(Array.from(result2), Array.from(Chunk.range(1, 999)))
    }))
})
