import { List } from "../../../src/collection/immutable/List"
import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { Semaphore } from "../../../src/io/Semaphore"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("flatMapParSwitch", () => {
    it("guarantee ordering no parallelism", async () => {
      const program = Effect.Do()
        .bind("lastExecuted", () => Ref.make(false))
        .bind("semaphore", () => Semaphore.make(1))
        .tap(({ lastExecuted, semaphore }) =>
          Stream(1, 2, 3, 4)
            .flatMapParSwitch(1, (i) =>
              i > 3
                ? Stream.acquireReleaseWith(Effect.unit, () =>
                    lastExecuted.set(true)
                  ).flatMap(() => Stream.empty)
                : Stream.scoped(semaphore.withPermitScoped()).flatMap(
                    () => Stream.never
                  )
            )
            .runDrain()
        )
        .flatMap(({ lastExecuted, semaphore }) =>
          semaphore.withPermit(lastExecuted.get)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("guarantee ordering with parallelism", async () => {
      const program = Effect.Do()
        .bind("lastExecuted", () => Ref.make(0))
        .bind("semaphore", () => Semaphore.make(4))
        .tap(({ lastExecuted, semaphore }) =>
          Stream.range(1, 13)
            .flatMapParSwitch(4, (i) =>
              i > 8
                ? Stream.acquireReleaseWith(Effect.unit, () =>
                    lastExecuted.update((n) => n + 1)
                  ).flatMap(() => Stream.empty)
                : Stream.scoped(semaphore.withPermitScoped()).flatMap(
                    () => Stream.never
                  )
            )
            .runDrain()
        )
        .flatMap(({ lastExecuted, semaphore }) =>
          semaphore.withPermits(4)(lastExecuted.get)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("short circuiting", async () => {
      const program = Stream(Stream.never, Stream(1))
        .flatMapParSwitch(1, identity)
        .take(1)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1])
    })

    it("interruption propagation", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("fiber", ({ latch, substreamCancelled }) =>
          Stream(undefined)
            .flatMapParSwitch(1, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .fork()
        )
        .tap(({ latch }) => latch.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ substreamCancelled }) => substreamCancelled.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("inner errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                substreamCancelled.set(true)
              )
            ),
            Stream.fromEffect(latch.await() > Effect.fail("ouch"))
          )
            .flatMapParSwitch(2, identity)
            .runDrain()
            .either()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get)

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result).toEqual(Either.left("ouch"))
    })

    it("outer errors interrupt all fibers", async () => {
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.fail("ouch")))
            .flatMapParSwitch(2, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .either()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get)

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result).toEqual(Either.left("ouch"))
    })

    it("inner defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          Stream(
            Stream.fromEffect(
              (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                substreamCancelled.set(true)
              )
            ),
            Stream.fromEffect(latch.await() > Effect.die(error))
          )
            .flatMapPar(2, identity)
            .runDrain()
            .exit()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get)

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("outer defects interrupt all fibers", async () => {
      const error = new RuntimeError("ouch")
      const program = Effect.Do()
        .bind("substreamCancelled", () => Ref.make(false))
        .bind("latch", () => Promise.make<never, void>())
        .bind("result", ({ latch, substreamCancelled }) =>
          (Stream(undefined) + Stream.fromEffect(latch.await() > Effect.die(error)))
            .flatMapParSwitch(2, () =>
              Stream.fromEffect(
                (latch.succeed(undefined) > Effect.never).onInterrupt(() =>
                  substreamCancelled.set(true)
                )
              )
            )
            .runDrain()
            .exit()
        )
        .bind("cancelled", ({ substreamCancelled }) => substreamCancelled.get)

      const { cancelled, result } = await program.unsafeRunPromise()

      expect(cancelled).toBe(true)
      expect(result.untraced()).toEqual(Exit.die(error))
    })

    it("finalizer ordering", async () => {
      const program = Effect.Do()
        .bind("effects", () => Ref.make(List.empty<string>()))
        .bindValue(
          "push",
          ({ effects }) =>
            (label: string) =>
              effects.update((list) => list.prepend(label))
        )
        .bindValue("inner", ({ push }) =>
          Stream.acquireReleaseWith(push("InnerAcquire"), () => push("InnerRelease"))
        )
        .tap(({ inner, push }) =>
          Stream.acquireReleaseWith(push("OuterAcquire").as(inner), () =>
            push("OuterRelease")
          )
            .flatMapParSwitch(2, identity)
            .runDrain()
        )
        .flatMap(({ effects }) => effects.get)

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([
        "OuterRelease",
        "InnerRelease",
        "InnerAcquire",
        "OuterAcquire"
      ])
    })
  })
})
