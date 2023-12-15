import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("drain - simple example", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(
        Stream.range(0, 9),
        Stream.mapEffect((n) => Ref.update(ref, Chunk.append(n))),
        Stream.drain,
        Stream.runDrain
      )
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(Array.from(result), Array.from(Chunk.range(0, 9)))
    }))

  it.effect("drain - is not too eager", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const result1 = yield* $(
        Stream.make(1),
        Stream.tap((n) => Ref.set(ref, n)),
        Stream.concat(Stream.fail("fail")),
        Stream.runDrain,
        Effect.either
      )
      const result2 = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result1, Either.left("fail"))
      assert.strictEqual(result2, 1)
    }))

  it.effect("drainFork - runs the other stream in the background", () =>
    Effect.gen(function*($) {
      const latch = yield* $(Deferred.make<never, void>())
      const result = yield* $(
        Stream.fromEffect(Deferred.await(latch)),
        Stream.drainFork(Stream.fromEffect(Deferred.succeed<never, void>(latch, void 0))),
        Stream.runDrain
      )
      assert.isUndefined(result)
    }))

  it.effect("drainFork - interrupts the background stream when the foreground exits", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      yield* $(
        Stream.make(1, 2, 3),
        Stream.concat(Stream.drain(Stream.fromEffect(Deferred.await(latch)))),
        Stream.drainFork(
          pipe(
            Deferred.succeed<never, void>(latch, void 0),
            Effect.zipRight(Effect.never),
            Effect.onInterrupt(() => Ref.set(ref, true)),
            Stream.fromEffect
          )
        ),
        Stream.runDrain
      )
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("drainFork - fails the foreground stream if the background fails with a typed error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.never,
        Stream.drainFork(Stream.fail("boom")),
        Stream.runDrain,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail("boom"))
    }))

  it.effect("drainFork - fails the foreground stream if the background fails with a defect", () =>
    Effect.gen(function*($) {
      const error = new Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.never,
        Stream.drainFork(Stream.die(error)),
        Stream.runDrain,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(error))
    }))
})
