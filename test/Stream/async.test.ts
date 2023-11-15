import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("async", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const result = yield* $(
        Stream.async<never, never, number>((emit) => {
          array.forEach((n) => {
            emit(Effect.succeed(Chunk.of(n)))
          })
        }),
        Stream.take(array.length),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncEffect - simple example", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const latch = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(
        Stream.asyncEffect<never, never, number>((emit) => {
          array.forEach((n) => {
            emit(Effect.succeed(Chunk.of(n)))
          })
          return pipe(
            Deferred.succeed<never, void>(latch, void 0),
            Effect.zipRight(Effect.unit)
          )
        }),
        Stream.take(array.length),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Deferred.await(latch))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncEffect - handles errors", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncEffect<never, Cause.RuntimeException, number>((emit) => {
          emit.fromEffect(Effect.fail(error))
          return Effect.unit
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncEffect - handles defects", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncEffect<never, Cause.RuntimeException, number>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncEffect - signals the end of the stream", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.asyncEffect<never, never, number>((emit) => {
          emit(Effect.fail(Option.none()))
          return Effect.unit
        }),
        Stream.runCollect
      )
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncEffect - backpressure", () =>
    Effect.gen(function*($) {
      const refCount = yield* $(Ref.make(0))
      const refDone = yield* $(Ref.make(false))
      const stream = Stream.asyncEffect<never, Option.Option<never>, number>((emit) => {
        Promise.all(
          // 1st consumed by sink, 2-6 – in queue, 7th – back pressured
          [1, 2, 3, 4, 5, 6, 7].map((n) =>
            emit.fromEffectChunk(
              pipe(
                Ref.set(refCount, n),
                Effect.zipRight(Effect.succeed(Chunk.of(1)))
              )
            )
          )
        ).then(() =>
          emit.fromEffect(
            pipe(
              Ref.set(refDone, true),
              Effect.zipRight(Effect.fail(Option.none()))
            )
          )
        )
        return Effect.unit
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* $(stream, Stream.run(sink), Effect.fork)
      yield* $(Ref.get(refCount), Effect.repeatWhile((n) => n !== 7))
      const result = yield* $(Ref.get(refDone))
      yield* $(Fiber.interrupt(fiber))
      assert.isFalse(result)
    }))

  it.effect("asyncInterrupt - left", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(
        Stream.asyncInterrupt<never, never, void>((emit) => {
          emit.chunk(Chunk.of(void 0))
          return Either.left(Ref.set(ref, true))
        }),
        Stream.tap(() => Deferred.succeed<never, void>(latch, void 0)),
        Stream.runDrain,
        Effect.fork
      )
      yield* $(Deferred.await(latch))
      yield* $(Fiber.interrupt(fiber))
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("asyncInterrupt - right", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.range(1, 5)
      const result = yield* $(
        Stream.asyncInterrupt<never, never, number>(() => Either.right(Stream.fromChunk(chunk))),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), Array.from(chunk))
    }))

  it.effect("asyncInterrupt - signals the end of the stream", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.asyncInterrupt<never, never, number>((emit) => {
          emit.end()
          return Either.left(Effect.unit)
        }),
        Stream.runCollect
      )
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncInterrupt - handles errors", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncInterrupt<never, Cause.RuntimeException, number>((emit) => {
          emit.fromEffect(Effect.fail(error))
          return Either.left(Effect.unit)
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncInterrupt - handles defects", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncInterrupt<never, Cause.RuntimeException, number>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncInterrupt - backpressure", () =>
    Effect.gen(function*($) {
      const refCount = yield* $(Ref.make(0))
      const refDone = yield* $(Ref.make(false))
      const stream = Stream.asyncInterrupt<never, Option.Option<never>, number>((emit) => {
        Promise.all(
          // 1st consumed by sink, 2-6 – in queue, 7th – back pressured
          [1, 2, 3, 4, 5, 6, 7].map((n) =>
            emit.fromEffectChunk(
              pipe(
                Ref.set(refCount, n),
                Effect.zipRight(Effect.succeed(Chunk.of(1)))
              )
            )
          )
        ).then(() =>
          emit.fromEffect(
            pipe(
              Ref.set(refDone, true),
              Effect.zipRight(Effect.fail(Option.none()))
            )
          )
        )
        return Either.left(Effect.unit)
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* $(stream, Stream.run(sink), Effect.fork)
      yield* $(Ref.get(refCount), Effect.repeatWhile((n) => n !== 7))
      const result = yield* $(Ref.get(refDone))
      yield* $(Fiber.interrupt(fiber), Effect.exit)
      assert.isFalse(result)
    }))

  it.effect("asyncOption - signals the end of the stream", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.asyncOption<never, never, number>((emit) => {
          emit(Effect.fail(Option.none()))
          return Option.none()
        }),
        Stream.runCollect
      )
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncOption - some", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.range(1, 5)
      const result = yield* $(
        Stream.asyncOption<never, never, number>(() => Option.some(Stream.fromChunk(chunk))),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), Array.from(chunk))
    }))

  it.effect("asyncOption - none", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const result = yield* $(
        Stream.asyncOption<never, never, number>((emit) => {
          array.forEach((n) => {
            emit(Effect.succeed(Chunk.of(n)))
          })
          return Option.none()
        }),
        Stream.take(array.length),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncOption - handles errors", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncOption<never, Cause.RuntimeException, number>((emit) => {
          emit.fromEffect(Effect.fail(error))
          return Option.none()
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncOption - handles defects", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncOption<never, Cause.RuntimeException, number>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncOption - backpressure", () =>
    Effect.gen(function*($) {
      const refCount = yield* $(Ref.make(0))
      const refDone = yield* $(Ref.make(false))
      const stream = Stream.asyncOption<never, Option.Option<never>, number>((emit) => {
        Promise.all(
          // 1st consumed by sink, 2-6 – in queue, 7th – back pressured
          [1, 2, 3, 4, 5, 6, 7].map((n) =>
            emit.fromEffectChunk(
              pipe(
                Ref.set(refCount, n),
                Effect.zipRight(Effect.succeed(Chunk.of(1)))
              )
            )
          )
        ).then(() =>
          emit.fromEffect(
            pipe(
              Ref.set(refDone, true),
              Effect.zipRight(Effect.fail(Option.none()))
            )
          )
        )
        return Option.none()
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* $(stream, Stream.run(sink), Effect.fork)
      yield* $(Ref.get(refCount), Effect.repeatWhile((n) => n !== 7))
      const result = yield* $(Ref.get(refDone))
      yield* $(Fiber.interrupt(fiber), Effect.exit)
      assert.isFalse(result)
    }))

  it.effect("asyncScoped", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const latch = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(
        Stream.asyncScoped<never, never, number>((cb) => {
          array.forEach((n) => {
            cb(Effect.succeed(Chunk.of(n)))
          })
          return pipe(
            Deferred.succeed<never, void>(latch, void 0),
            Effect.asUnit
          )
        }),
        Stream.take(array.length),
        Stream.run(Sink.collectAll()),
        Effect.fork
      )
      yield* $(Deferred.await(latch))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncScoped - signals the end of the stream", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.asyncScoped<never, never, number>((cb) => {
          cb(Effect.fail(Option.none()))
          return Effect.unit
        }),
        Stream.runCollect
      )
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncScoped - handles errors", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncScoped<never, Cause.RuntimeException, number>((cb) => {
          cb(Effect.fail(Option.some(error)))
          return Effect.unit
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncScoped - handles defects", () =>
    Effect.gen(function*($) {
      const error = Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.asyncScoped<never, Cause.RuntimeException, number>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncScoped - backpressure", () =>
    Effect.gen(function*($) {
      const refCount = yield* $(Ref.make(0))
      const refDone = yield* $(Ref.make(false))
      const stream = Stream.asyncScoped<never, Option.Option<never>, number>((cb) => {
        Promise.all(
          // 1st consumed by sink, 2-6 – in queue, 7th – back pressured
          [1, 2, 3, 4, 5, 6, 7].map((n) =>
            cb(
              pipe(
                Ref.set(refCount, n),
                Effect.zipRight(Effect.succeed(Chunk.of(1)))
              )
            )
          )
        ).then(() =>
          cb(
            pipe(
              Ref.set(refDone, true),
              Effect.zipRight(Effect.fail(Option.none()))
            )
          )
        )
        return Effect.unit
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* $(stream, Stream.run(sink), Effect.fork)
      yield* $(Ref.get(refCount), Effect.repeatWhile((n) => n !== 7))
      const result = yield* $(Ref.get(refDone))
      yield* $(Fiber.interrupt(fiber), Effect.exit)
      assert.isFalse(result)
    }))
})
