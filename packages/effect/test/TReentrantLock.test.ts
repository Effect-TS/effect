import { describe, it } from "@effect/vitest"
import { assertNone, strictEqual } from "@effect/vitest/utils"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as STM from "effect/STM"
import * as TReentrantLock from "effect/TReentrantLock"

const pollSchedule = <E, A>(): Schedule.Schedule<Option.Option<Exit.Exit<E, A>>, Option.Option<Exit.Exit<E, A>>> =>
  pipe(
    Schedule.recurs(100),
    Schedule.zipRight(
      pipe(
        Schedule.identity<Option.Option<Exit.Exit<E, A>>>(),
        Schedule.whileOutput(Option.isNone)
      )
    )
  )

describe("TReentrantLock", () => {
  it.effect("one read lock", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const result = yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap(Effect.succeed),
        Effect.scoped
      ))
      strictEqual(result, 1)
    }))

  it.effect("two read locks from the same fiber", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const result = yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap(() =>
          pipe(
            TReentrantLock.readLock(lock),
            Effect.flatMap(Effect.succeed),
            Effect.scoped
          )
        ),
        Effect.scoped
      ))
      strictEqual(result, 2)
    }))

  it.effect("two read locks from different fibers", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const rLatch = yield* (Deferred.make<void>())
      const mLatch = yield* (Deferred.make<void>())
      const wLatch = yield* (Deferred.make<void>())
      yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap((count) =>
          pipe(
            mLatch,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(Deferred.await(rLatch)),
            Effect.as(count)
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(mLatch))
      const fiber = yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap((count) =>
          pipe(
            wLatch,
            Deferred.succeed<void>(void 0),
            Effect.as(count)
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(wLatch))
      const result = yield* (Fiber.join(fiber))
      strictEqual(result, 1)
    }))

  it.effect("one write lock, then one read lock, different fibers", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const rLatch = yield* (Deferred.make<void>())
      const mLatch = yield* (Deferred.make<void>())
      const wLatch = yield* (Deferred.make<void>())
      yield* (pipe(
        TReentrantLock.writeLock(lock),
        Effect.flatMap((count) =>
          pipe(
            rLatch,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(Deferred.await(wLatch)),
            Effect.as(count)
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(rLatch))
      const fiber = yield* (pipe(
        mLatch,
        Deferred.succeed<void>(void 0),
        Effect.zipRight(Effect.scoped(TReentrantLock.readLock(lock))),
        Effect.fork
      ))
      yield* (Deferred.await(mLatch))
      const locks = yield* (pipe(
        TReentrantLock.readLocks(lock),
        STM.zipWith(TReentrantLock.writeLocks(lock), (x, y) => x + y),
        STM.commit
      ))
      const option = yield* (pipe(
        Fiber.poll(fiber),
        Effect.repeat(pollSchedule())
      ))
      yield* (pipe(wLatch, Deferred.succeed<void>(void 0)))
      const readerCount = yield* (Fiber.join(fiber))
      strictEqual(locks, 1)
      assertNone(option)
      strictEqual(readerCount, 1)
    }))

  it.effect("write lock followed by read lock from the same fiber", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const ref = yield* (Ref.make(0))
      const readerCount = yield* (pipe(
        TReentrantLock.writeLock(lock),
        Effect.flatMap(() =>
          pipe(
            TReentrantLock.readLock(lock),
            Effect.flatMap((count) =>
              pipe(
                STM.commit(TReentrantLock.writeLocks(lock)),
                Effect.flatMap((n) => pipe(ref, Ref.set(n))),
                Effect.as(count)
              )
            ),
            Effect.scoped
          )
        ),
        Effect.scoped
      ))
      const writerCount = yield* (Ref.get(ref))
      strictEqual(readerCount, 1)
      strictEqual(writerCount, 1)
    }))

  it.effect("upgrade read lock to write lock from the same fiber", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const ref = yield* (Ref.make(0))
      const readerCount = yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap(() =>
          pipe(
            TReentrantLock.writeLock(lock),
            Effect.flatMap((count) =>
              pipe(
                TReentrantLock.writeLocks(lock),
                Effect.flatMap((n) => pipe(ref, Ref.set(n))),
                Effect.as(count)
              )
            ),
            Effect.scoped
          )
        ),
        Effect.scoped
      ))
      const writerCount = yield* (Ref.get(ref))
      strictEqual(readerCount, 1)
      strictEqual(writerCount, 1)
    }))

  it.effect("read to writer upgrade with other readers", () =>
    Effect.gen(function*() {
      const lock = yield* (TReentrantLock.make)
      const rLatch = yield* (Deferred.make<void>())
      const mLatch = yield* (Deferred.make<void>())
      const wLatch = yield* (Deferred.make<void>())
      yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap((count) =>
          pipe(
            mLatch,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(Deferred.await(rLatch)),
            Effect.as(count)
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(mLatch))
      const fiber = yield* (pipe(
        TReentrantLock.readLock(lock),
        Effect.flatMap(() =>
          pipe(
            wLatch,
            Deferred.succeed<void>(void 0),
            Effect.zipRight(
              pipe(
                TReentrantLock.writeLock(lock),
                Effect.flatMap(Effect.succeed),
                Effect.scoped
              )
            )
          )
        ),
        Effect.scoped,
        Effect.fork
      ))
      yield* (Deferred.await(wLatch))
      const option = yield* (pipe(Fiber.poll(fiber), Effect.repeat(pollSchedule())))
      yield* (pipe(rLatch, Deferred.succeed<void>(void 0)))
      const count = yield* (Fiber.join(fiber))
      assertNone(option)
      strictEqual(count, 1)
    }))
})
