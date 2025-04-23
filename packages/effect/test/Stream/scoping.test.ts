import { describe, it } from "@effect/vitest"
import { assertFalse, assertLeft, assertSome, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("acquireRelease - simple example", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const stream = Stream.acquireRelease(
        Effect.succeed(Chunk.range(0, 2)),
        () => Ref.set(ref, true)
      ).pipe(Stream.flatMap(Stream.fromIterable))
      const result = yield* Stream.runCollect(stream)
      const released = yield* Ref.get(ref)
      assertTrue(released)
      deepStrictEqual(Chunk.toArray(result), [0, 1, 2])
    }))

  it.effect("acquireRelease - short circuits", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const stream = Stream.acquireRelease(
        Effect.succeed(Chunk.range(0, 2)),
        () => Ref.set(ref, true)
      ).pipe(
        Stream.flatMap(Stream.fromIterable),
        Stream.take(2)
      )
      const result = yield* Stream.runCollect(stream)
      const released = yield* Ref.get(ref)
      assertTrue(released)
      deepStrictEqual(Chunk.toArray(result), [0, 1])
    }))

  it.effect("acquireRelease - no acquisition when short circuiting", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      const stream = Stream.make(1).pipe(
        Stream.concat(
          Stream.acquireRelease(
            Ref.set(ref, true),
            () => Effect.void
          )
        ),
        Stream.take(0)
      )
      yield* Stream.runDrain(stream)
      const result = yield* Ref.get(ref)
      assertFalse(result)
    }))

  it.effect("acquireRelease - releases when there are defects", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(false)
      yield* Stream.acquireRelease(
        Effect.void,
        () => Ref.set(ref, true)
      ).pipe(
        Stream.flatMap(() => Stream.fromEffect(Effect.dieMessage("boom"))),
        Stream.runDrain,
        Effect.exit
      )
      const result = yield* Ref.get(ref)
      assertTrue(result)
    }))

  it.effect("acquireRelease - flatMap associativity does not effect lifetime", () =>
    Effect.gen(function*() {
      const leftAssoc = yield* Stream.acquireRelease(
        Ref.make(true),
        (ref) => Ref.set(ref, false)
      ).pipe(
        Stream.flatMap(Stream.succeed),
        Stream.flatMap((ref) => Stream.fromEffect(Ref.get(ref))),
        Stream.runCollect,
        Effect.map(Chunk.head)
      )
      const rightAssoc = yield* Stream.acquireRelease(
        Ref.make(true),
        (ref) => Ref.set(ref, false)
      ).pipe(
        Stream.flatMap((ref) =>
          Stream.succeed(ref).pipe(
            Stream.flatMap((ref) => Stream.fromEffect(Ref.get(ref)))
          )
        ),
        Stream.runCollect,
        Effect.map(Chunk.head)
      )
      assertSome(leftAssoc, true)
      assertSome(rightAssoc, true)
    }))

  it.effect("acquireRelease - propagates errors", () =>
    Effect.gen(function*() {
      const result = yield* Stream.acquireRelease(
        Effect.void,
        () => Effect.dieMessage("die")
      ).pipe(
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("die")))
    }))

  it.effect("ensuring", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(Chunk.empty<string>())
      yield* Stream.acquireRelease(
        Ref.update(ref, Chunk.append("Acquire")),
        () => Ref.update(ref, Chunk.append("Release"))
      ).pipe(
        Stream.crossRight(Stream.fromEffect(Ref.update(ref, Chunk.append("Use")))),
        Stream.ensuring(Ref.update(ref, Chunk.append("Ensuring"))),
        Stream.runDrain
      )
      const result = yield* Ref.get(ref)
      deepStrictEqual(Chunk.toArray(result), ["Acquire", "Use", "Release", "Ensuring"])
    }))

  it.effect("scoped - preserves the failure of an effect", () =>
    Effect.gen(function*() {
      const result = yield* Stream.scoped(Effect.fail("fail")).pipe(
        Stream.runCollect,
        Effect.either
      )
      assertLeft(result, "fail")
    }))

  it.effect("scoped - preserves the interruptibility of an effect", () =>
    Effect.gen(function*() {
      const isInterruptible1 = yield* Effect.checkInterruptible(Effect.succeed).pipe(
        Stream.scoped,
        Stream.runHead
      )
      const isInterruptible2 = yield* Effect.uninterruptible(
        Effect.checkInterruptible(Effect.succeed)
      ).pipe(Stream.scoped, Stream.runHead)
      assertSome(isInterruptible1, true)
      assertSome(isInterruptible2, false)
    }))

  it("unwrapScoped", async () => {
    const awaiter = Deferred.unsafeMake<void>(FiberId.none)
    const program = Effect.gen(function*() {
      const stream = (deferred: Deferred.Deferred<void, never>, ref: Ref.Ref<ReadonlyArray<string>>) =>
        Effect.acquireRelease(
          Ref.update(ref, (array) => [...array, "acquire outer"]),
          () => Ref.update(ref, (array) => [...array, "release outer"])
        ).pipe(
          Effect.zipRight(Deferred.succeed(deferred, void 0)),
          Effect.zipRight(Deferred.await(awaiter)),
          Effect.zipRight(Effect.succeed(Stream.make(1, 2, 3))),
          Stream.unwrapScoped
        )
      const ref = yield* Ref.make<ReadonlyArray<string>>([])
      const deferred = yield* Deferred.make<void>()
      const fiber = yield* stream(deferred, ref).pipe(Stream.runDrain, Effect.fork)
      yield* Deferred.await(deferred)
      yield* Fiber.interrupt(fiber)
      return yield* Ref.get(ref)
    })
    const result = await Effect.runPromise(program)
    await Effect.runPromise(Deferred.succeed(awaiter, void 0))
    deepStrictEqual(result, ["acquire outer", "release outer"])
  })

  it.effect("preserves the scope", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(Array.empty<string>())
      const scope = yield* Scope.make()
      yield* Stream.make(1, 2).pipe(
        Stream.flatMap((i) =>
          Stream.fromEffect(Effect.acquireRelease(
            Ref.update(ref, Array.append(`Acquire: ${i}`)),
            () => Ref.update(ref, Array.append(`Release: ${i}`))
          )), { bufferSize: 1, concurrency: "unbounded" }),
        Stream.runDrain,
        Scope.extend(scope)
      )
      const before = yield* Ref.getAndSet(ref, Array.empty())
      yield* Scope.close(scope, Exit.void)
      const after = yield* Ref.get(ref)
      deepStrictEqual(before, ["Acquire: 1", "Acquire: 2"])
      deepStrictEqual(after, ["Release: 2", "Release: 1"])
    }))
})
