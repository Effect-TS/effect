import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("async", () =>
    Effect.gen(function*() {
      const array = [1, 2, 3, 4, 5]
      const result = yield* pipe(
        Stream.async<number>((emit) => {
          array.forEach((n) => {
            emit(Effect.succeed(Chunk.of(n)))
          })
        }),
        Stream.take(array.length),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), array)
    }))

  it.effect("async - with cleanup", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Stream.async<void>((emit) => {
          emit.chunk(Chunk.of(void 0))
          return Ref.set(ref, true)
        }),
        Stream.tap(() => Deferred.succeed(latch, void 0)),
        Stream.runDrain,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("async - signals the end of the stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.async<number>((emit) => {
          emit.end()
          return Effect.void
        }),
        Stream.runCollect
      )
      assertTrue(Chunk.isEmpty(result))
    }))

  it.effect("async - handles errors", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.async<number, Cause.RuntimeException>((emit) => {
          emit.fromEffect(Effect.fail(error))
          return Effect.void
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("async - handles defects", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.async<number, Cause.RuntimeException>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("async - backpressure", () =>
    Effect.gen(function*() {
      const refCount = yield* (Ref.make(0))
      const refDone = yield* (Ref.make(false))
      const stream = Stream.async<number, Option.Option<never>>((emit) => {
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
        return Effect.void
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* pipe(stream, Stream.run(sink), Effect.fork)
      yield* pipe(Ref.get(refCount), Effect.repeat({ while: (n) => n !== 7 }))
      const result = yield* (Ref.get(refDone))
      yield* pipe(Fiber.interrupt(fiber), Effect.exit)
      assertFalse(result)
    }))

  it.effect("asyncEffect - simple example", () =>
    Effect.gen(function*() {
      const array = [1, 2, 3, 4, 5]
      const latch = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Stream.asyncEffect<number>((emit) => {
          array.forEach((n) => {
            emit(Effect.succeed(Chunk.of(n)))
          })
          return pipe(
            Deferred.succeed(latch, void 0),
            Effect.zipRight(Effect.void)
          )
        }),
        Stream.take(array.length),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncEffect - handles errors", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.asyncEffect<number, Cause.RuntimeException>((emit) => {
          emit.fromEffect(Effect.fail(error))
          return Effect.void
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncEffect - handles defects", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.asyncEffect<number, Cause.RuntimeException>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncEffect - signals the end of the stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.asyncEffect<number>((emit) => {
          emit(Effect.fail(Option.none()))
          return Effect.void
        }),
        Stream.runCollect
      )
      assertTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncEffect - backpressure", () =>
    Effect.gen(function*() {
      const refCount = yield* (Ref.make(0))
      const refDone = yield* (Ref.make(false))
      const stream = Stream.asyncEffect<number, Option.Option<never>>((emit) => {
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
        return Effect.void
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* pipe(stream, Stream.run(sink), Effect.fork)
      yield* pipe(Ref.get(refCount), Effect.repeat({ while: (n) => n !== 7 }))
      const result = yield* (Ref.get(refDone))
      yield* (Fiber.interrupt(fiber))
      assertFalse(result)
    }))

  // it.effect("asyncOption - signals the end of the stream", () =>
  //   Effect.gen(function*() {
  //     const result = yield* (
  //       Stream.asyncOption<number>((emit) => {
  //         emit(Effect.fail(Option.none()))
  //         return Option.none()
  //       }),
  //       Stream.runCollect
  //     )
  //     assertTrue(Chunk.isEmpty(result))
  //   }))

  // it.effect("asyncOption - some", () =>
  //   Effect.gen(function*() {
  //     const chunk = Chunk.range(1, 5)
  //     const result = yield* (
  //       Stream.asyncOption<number>(() => Option.some(Stream.fromChunk(chunk))),
  //       Stream.runCollect
  //     )
  //     deepStrictEqual(Array.from(result), Array.from(chunk))
  //   }))

  // it.effect("asyncOption - none", () =>
  //   Effect.gen(function*() {
  //     const array = [1, 2, 3, 4, 5]
  //     const result = yield* (
  //       Stream.asyncOption<number>((emit) => {
  //         array.forEach((n) => {
  //           emit(Effect.succeed(Chunk.of(n)))
  //         })
  //         return Option.none()
  //       }),
  //       Stream.take(array.length),
  //       Stream.runCollect
  //     )
  //     deepStrictEqual(Array.from(result), array)
  //   }))

  // it.effect("asyncOption - handles errors", () =>
  //   Effect.gen(function*() {
  //     const error = new Cause.RuntimeException("boom")
  //     const result = yield* (
  //       Stream.asyncOption<number, Cause.RuntimeException>((emit) => {
  //         emit.fromEffect(Effect.fail(error))
  //         return Option.none()
  //       }),
  //       Stream.runCollect,
  //       Effect.exit
  //     )
  //     deepStrictEqual(result, Exit.fail(error))
  //   }))

  // it.effect("asyncOption - handles defects", () =>
  //   Effect.gen(function*() {
  //     const error = new Cause.RuntimeException("boom")
  //     const result = yield* (
  //       Stream.asyncOption<number, Cause.RuntimeException>(() => {
  //         throw error
  //       }),
  //       Stream.runCollect,
  //       Effect.exit
  //     )
  //     deepStrictEqual(result, Exit.die(error))
  //   }))

  // it.effect("asyncOption - backpressure", () =>
  //   Effect.gen(function*() {
  //     const refCount = yield* (Ref.make(0))
  //     const refDone = yield* (Ref.make(false))
  //     const stream = Stream.asyncOption<number, Option.Option<never>>((emit) => {
  //       Promise.all(
  //         // 1st consumed by sink, 2-6 – in queue, 7th – back pressured
  //         [1, 2, 3, 4, 5, 6, 7].map((n) =>
  //           emit.fromEffectChunk(
  //             pipe(
  //               Ref.set(refCount, n),
  //               Effect.zipRight(Effect.succeed(Chunk.of(1)))
  //             )
  //           )
  //         )
  //       ).then(() =>
  //         emit.fromEffect(
  //           pipe(
  //             Ref.set(refDone, true),
  //             Effect.zipRight(Effect.fail(Option.none()))
  //           )
  //         )
  //       )
  //       return Option.none()
  //     }, 5)
  //     const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
  //     const fiber = yield* (stream, Stream.run(sink), Effect.fork)
  //     yield* (Ref.get(refCount), Effect.repeat({ while: (n) => n !== 7 }))
  //     const result = yield* (Ref.get(refDone))
  //     yield* (Fiber.interrupt(fiber), Effect.exit)
  //     assertFalse(result)
  //   }))

  it.effect("asyncScoped", () =>
    Effect.gen(function*() {
      const array = [1, 2, 3, 4, 5]
      const latch = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Stream.asyncScoped<number>((cb) => {
          array.forEach((n) => {
            cb(Effect.succeed(Chunk.of(n)))
          })
          return pipe(
            Deferred.succeed(latch, void 0),
            Effect.asVoid
          )
        }),
        Stream.take(array.length),
        Stream.run(Sink.collectAll()),
        Effect.fork
      )
      yield* (Deferred.await(latch))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncScoped - signals the end of the stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.asyncScoped<number>((cb) => {
          cb(Effect.fail(Option.none()))
          return Effect.void
        }),
        Stream.runCollect
      )
      assertTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncScoped - handles errors", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.asyncScoped<number, Cause.RuntimeException>((cb) => {
          cb(Effect.fail(Option.some(error)))
          return Effect.void
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncScoped - handles defects", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.asyncScoped<number, Cause.RuntimeException>(() => {
          throw error
        }),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("asyncScoped - backpressure", () =>
    Effect.gen(function*() {
      const refCount = yield* (Ref.make(0))
      const refDone = yield* (Ref.make(false))
      const stream = Stream.asyncScoped<number, Option.Option<never>>((cb) => {
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
        return Effect.void
      }, 5)
      const sink = pipe(Sink.take<number>(1), Sink.zipRight(Sink.never))
      const fiber = yield* pipe(stream, Stream.run(sink), Effect.fork)
      yield* pipe(Ref.get(refCount), Effect.repeat({ while: (n) => n !== 7 }))
      const result = yield* (Ref.get(refDone))
      yield* pipe(Fiber.interrupt(fiber), Effect.exit)
      assertFalse(result)
    }))

  it.effect("asyncPush", () =>
    Effect.gen(function*() {
      const array = [1, 2, 3, 4, 5]
      const latch = yield* Deferred.make<void>()
      const fiber = yield* Stream.asyncPush<number>((emit) => {
        array.forEach((n) => {
          emit.single(n)
        })
        return pipe(
          Deferred.succeed(latch, void 0),
          Effect.asVoid
        )
      }).pipe(
        Stream.take(array.length),
        Stream.run(Sink.collectAll()),
        Effect.fork
      )
      yield* Deferred.await(latch)
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(Array.from(result), array)
    }))

  it.effect("asyncPush - signals the end of the stream", () =>
    Effect.gen(function*() {
      const result = yield* Stream.asyncPush<number>((emit) => {
        emit.end()
        return Effect.void
      }).pipe(Stream.runCollect)
      assertTrue(Chunk.isEmpty(result))
    }))

  it.effect("asyncPush - handles errors", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* Stream.asyncPush<number, Cause.RuntimeException>((emit) => {
        emit.fail(error)
        return Effect.void
      }).pipe(
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("asyncPush - handles defects", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* Stream.asyncPush<number, Cause.RuntimeException>(() => {
        throw error
      }).pipe(
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))
})
