import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("acquireRelease - simple example", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const stream = pipe(
        Stream.acquireRelease(
          Effect.succeed(Chunk.range(0, 2)),
          () => Ref.set(ref, true)
        ),
        Stream.flatMap(Stream.fromIterable)
      )
      const result = yield* $(Stream.runCollect(stream))
      const released = yield* $(Ref.get(ref))
      assert.isTrue(released)
      assert.deepStrictEqual(Array.from(result), [0, 1, 2])
    }))

  it.effect("acquireRelease - short circuits", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const stream = pipe(
        Stream.acquireRelease(
          Effect.succeed(Chunk.range(0, 2)),
          () => Ref.set(ref, true)
        ),
        Stream.flatMap(Stream.fromIterable),
        Stream.take(2)
      )
      const result = yield* $(Stream.runCollect(stream))
      const released = yield* $(Ref.get(ref))
      assert.isTrue(released)
      assert.deepStrictEqual(Array.from(result), [0, 1])
    }))

  it.effect("acquireRelease - no acquisition when short circuiting", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const stream = pipe(
        Stream.make(1),
        Stream.concat(Stream.acquireRelease(Ref.set(ref, true), () => Effect.unit)),
        Stream.take(0)
      )
      yield* $(Stream.runDrain(stream))
      const result = yield* $(Ref.get(ref))
      assert.isFalse(result)
    }))

  it.effect("acquireRelease - releases when there are defects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      yield* $(
        Stream.acquireRelease(Effect.unit, () => Ref.set(ref, true)),
        Stream.flatMap(() => Stream.fromEffect(Effect.dieMessage("boom"))),
        Stream.runDrain,
        Effect.exit
      )
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("acquireRelease - flatMap associativity does not effect lifetime", () =>
    Effect.gen(function*($) {
      const leftAssoc = yield* $(
        Stream.acquireRelease(Ref.make(true), (ref) => Ref.set(ref, false)),
        Stream.flatMap(Stream.succeed),
        Stream.flatMap((ref) => Stream.fromEffect(Ref.get(ref))),
        Stream.runCollect,
        Effect.map(Chunk.head)
      )
      const rightAssoc = yield* $(
        Stream.acquireRelease(Ref.make(true), (ref) => Ref.set(ref, false)),
        Stream.flatMap((ref) =>
          pipe(
            Stream.succeed(ref),
            Stream.flatMap((ref) => Stream.fromEffect(Ref.get(ref)))
          )
        ),
        Stream.runCollect,
        Effect.map(Chunk.head)
      )
      assert.deepStrictEqual(leftAssoc, Option.some(true))
      assert.deepStrictEqual(rightAssoc, Option.some(true))
    }))

  it.effect("acquireRelease - propagates errors", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.acquireRelease(Effect.unit, () => Effect.dieMessage("die")),
        Stream.runCollect,
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(Cause.RuntimeException("die")))
    }))

  it.effect("ensuring", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<string>()))
      yield* $(
        Stream.acquireRelease(
          Ref.update(ref, Chunk.append("Acquire")),
          () => Ref.update(ref, Chunk.append("Release"))
        ),
        Stream.crossRight(Stream.fromEffect(Ref.update(ref, Chunk.append("Use")))),
        Stream.ensuring(Ref.update(ref, Chunk.append("Ensuring"))),
        Stream.runDrain
      )
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(Array.from(result), ["Acquire", "Use", "Release", "Ensuring"])
    }))

  it.effect("scoped - preserves the failure of an effect", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.scoped(Effect.fail("fail")),
        Stream.runCollect,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail"))
    }))

  it.effect("scoped - preserves the interruptibility of an effect", () =>
    Effect.gen(function*($) {
      const isInterruptible1 = yield* $(
        Stream.scoped(Effect.checkInterruptible(Effect.succeed)),
        Stream.runHead
      )
      const isInterruptible2 = yield* $(
        Stream.scoped(Effect.uninterruptible(Effect.checkInterruptible(Effect.succeed))),
        Stream.runHead
      )
      assert.deepStrictEqual(isInterruptible1, Option.some(true))
      assert.deepStrictEqual(isInterruptible2, Option.some(false))
    }))

  it.it("unwrapScoped", async () => {
    const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
    const program = Effect.gen(function*($) {
      const stream = (deferred: Deferred.Deferred<never, void>, ref: Ref.Ref<ReadonlyArray<string>>) =>
        pipe(
          Effect.acquireRelease(
            Ref.update(ref, (array) => [...array, "acquire outer"]),
            () => Ref.update(ref, (array) => [...array, "release outer"])
          ),
          Effect.zipRight(Deferred.succeed<never, void>(deferred, void 0)),
          Effect.zipRight(Deferred.await(awaiter)),
          Effect.zipRight(Effect.succeed(Stream.make(1, 2, 3))),
          Stream.unwrapScoped
        )
      const ref = yield* $(Ref.make<ReadonlyArray<string>>([]))
      const deferred = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(stream(deferred, ref), Stream.runDrain, Effect.fork)
      yield* $(Deferred.await(deferred))
      yield* $(Fiber.interrupt(fiber))
      return yield* $(Ref.get(ref))
    })
    const result = await Effect.runPromise(program)
    await Effect.runPromise(Deferred.succeed<never, void>(awaiter, void 0))
    assert.deepStrictEqual(result, ["acquire outer", "release outer"])
  })
})
