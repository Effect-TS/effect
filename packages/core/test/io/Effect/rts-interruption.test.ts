import { List } from "../../../src/collection/immutable/List"
import { Duration } from "../../../src/data/Duration"
import { Either } from "../../../src/data/Either"
import { constTrue, constVoid } from "../../../src/data/Function"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { FiberId } from "../../../src/io/FiberId"
import { Promise } from "../../../src/io/Promise"
import { Ref } from "../../../src/io/Ref"
import { AtomicNumber } from "../../../src/support/AtomicNumber"
import { withLatch, withLatchAwait } from "../../test-utils/Latch"

describe("Effect", () => {
  describe("RTS interruption", () => {
    it("sync forever is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.succeed(1).forever().fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupt of never is interrupted with cause", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.never.fork())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isFailure() && result.cause.isInterruptedOnly()).toBe(true)
    })

    it("asyncEffect is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.asyncEffect(() => Effect.never).fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("async is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.async(constVoid).fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    // FIXED: swapped Effect.never with Promise.await
    it("acquireReleaseWith is uninterruptible", async () => {
      const awaiter = Promise.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined) < awaiter.await(),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon()
        )
        .flatMap(
          ({ fiber, promise }) =>
            promise.await() >
            fiber.interrupt().timeoutTo(42, () => 0, Duration.fromSeconds(1))
        )

      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()

      expect(result).toBe(42)
    })

    // FIXED: swapped Effect.never with Promise.await
    it("acquireReleaseExitWith is uninterruptible", async () => {
      const awaiter = Promise.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          Effect.acquireReleaseWith(
            promise.succeed(undefined) > awaiter.await() > Effect.succeed(1),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon()
        )
        .flatMap(
          ({ fiber, promise }) =>
            promise.await() >
            fiber.interrupt().timeoutTo(42, () => 0, Duration.fromSeconds(1))
        )

      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("acquireReleaseWith use is interruptible", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith use is interruptible", async () => {
      const program = Effect.acquireReleaseExitWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .fork()
        .flatMap((fiber) =>
          fiber.interrupt().timeoutTo(42, () => 0, Duration.fromSeconds(1))
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          Effect.acquireReleaseWith(
            Effect.unit,
            () => promise1.succeed(undefined) > Effect.never,
            () => promise2.succeed(undefined) > Effect.unit
          ).fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .timeoutTo(42, () => 0, Duration.fromSeconds(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseExitWith release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("done", () => Promise.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireReleaseExitWith(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            )
          ).fork()
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) =>
          done.await().timeoutTo(42, () => 0, Duration.fromMinutes(1))
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, number>())
        .bind("promise3", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, promise3 }) =>
          Effect.acquireReleaseWith(
            promise1.succeed(undefined) > promise2.await(),
            () => Effect.unit,
            () => promise3.await()
          )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ promise3 }) => promise3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith disconnect acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("promise3", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, promise3 }) =>
          Effect.acquireReleaseExitWith(
            promise1.succeed(undefined) > promise2.await(),
            () => Effect.unit,
            () => promise3.await()
          )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ promise3 }) => promise3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseWith disconnect use is interruptible", async () => {
      const program = Effect.acquireReleaseWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .disconnect()
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("acquireReleaseExitWith disconnect use is interruptible", async () => {
      const program = Effect.acquireReleaseExitWith(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .disconnect()
        .fork()
        .flatMap((fiber) =>
          fiber.interrupt().timeoutTo(42, () => 0, Duration.fromSeconds(1))
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("acquireReleaseWith disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          Effect.acquireReleaseWith(
            Effect.unit,
            () => promise1.succeed(undefined) > Effect.never,
            () => promise2.succeed(undefined) > Effect.unit
          )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .timeoutTo(false, () => true, Duration.fromSeconds(10))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("acquireReleaseExitWith disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("done", () => Promise.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireReleaseExitWith(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            )
              .disconnect()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) =>
          done.await().timeoutTo(false, () => true, Duration.fromSeconds(10))
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("catchAll + ensuring + interrupt", async () => {
      const program = Effect.Do()
        .bind("cont", () => Promise.make<never, void>())
        .bind("promise", () => Promise.make<never, boolean>())
        .bind("fiber", ({ cont, promise }) =>
          (cont.succeed(undefined) > Effect.never)
            .catchAll(Effect.failNow)
            .ensuring(promise.succeed(true))
            .fork()
        )
        .tap(({ cont }) => cont.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ promise }) => promise.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("finalizer can detect interruption", async () => {
      const program = Effect.Do()
        .bind("promise1", () => Promise.make<never, boolean>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2 }) =>
          (promise2.succeed(undefined) > Effect.never)
            .ensuring(
              Effect.descriptor.flatMap((descriptor) =>
                promise1.succeed(descriptor.interrupters.size > 0)
              )
            )
            .fork()
        )
        .tap(({ promise2 }) => promise2.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ promise1 }) => promise1.await())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interrupted cause persists after catching", async () => {
      function process(list: List<Exit<never, any>>): List<Exit<never, any>> {
        return list.map((exit) => exit.mapErrorCause((cause) => cause.untraced()))
      }

      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("exits", () => Ref.make(List<Exit<never, any>>()))
        .bind("fiber", ({ exits, latch1, latch2 }) =>
          Effect.uninterruptibleMask(({ restore }) =>
            restore(
              Effect.uninterruptibleMask(({ restore }) =>
                restore(latch1.succeed(undefined) > latch2.await()).onExit((exit) =>
                  exits.update((list) => list.prepend(exit))
                )
              ) > Effect.unit
            )
              .exit()
              .flatMap((exit) => exits.update((list) => list.prepend(exit)))
              .fork()
          )
        )
        .tap(({ fiber, latch1 }) => latch1.await() > fiber.interrupt())
        .flatMap(({ exits }) => exits.get.map(process))

      const result = await program.unsafeRunPromise()

      expect(result.length).toEqual(2)
      expect(
        result.reduce(
          true,
          (acc, curr) => acc && curr.isFailure() && curr.cause.isInterruptedOnly()
        )
      )
    })

    it("interruption of raced", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("cont1", () => Promise.make<never, void>())
        .bind("cont2", () => Promise.make<never, void>())
        .bindValue(
          "make",
          ({ ref }) =>
            (p: Promise<never, void>) =>
              (p.succeed(undefined) > Effect.never).onInterrupt(() =>
                ref.update((n) => n + 1)
              )
        )
        .bind("raced", ({ cont1, cont2, make }) => make(cont1).race(make(cont2)).fork())
        .tap(({ cont1, cont2 }) => cont1.await() > cont2.await())
        .tap(({ raced }) => raced.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("recovery of error in finalizer", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(false))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never)
              .ensuring(
                (Effect.unit > Effect.fail("uh oh")).catchAll(() => recovered.set(true))
              )
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("recovery of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(false))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .foldCauseEffect(
                (cause) => recovered.set(cause.isInterrupted()),
                () => recovered.set(false)
              )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("sandbox of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(Option.emptyOf<Either<boolean, any>>()))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .sandbox()
              .either()
              .flatMap((either) =>
                recovered.set(
                  Option.some(either.mapLeft((cause) => cause.isInterrupted()))
                )
              )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(Either.left(true)))
    })

    it("run of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(Option.emptyOf<boolean>()))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .exit()
              .flatMap((exit) => recovered.set(Option.some(exit.isInterrupted())))
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get)

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(true))
    })

    it("alternating interruptibility", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bind("fiber", ({ counter }) =>
          withLatch((release) =>
            (
              (
                release >
                Effect.never.interruptible().exit() >
                counter.update((n) => n + 1)
              )
                .uninterruptible()
                .interruptible()
                .exit() > counter.update((n) => n + 1)
            )
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ counter }) => counter.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(2)
    })

    it("interruption after defect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (
              Effect.attempt(() => {
                throw new Error()
              }).exit() >
              release >
              Effect.never
            )
              .ensuring(ref.set(true))
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("interruption after defect 2", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (
              Effect.attempt(() => {
                throw new Error()
              }).exit() >
              release >
              Effect.unit.forever()
            )
              .ensuring(ref.set(true))
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    // FIXED: swapped Effect.never for Promises
    it("disconnect returns immediately on interrupt", async () => {
      const awaiter1 = Promise.unsafeMake<never, void>(FiberId.none)
      const awaiter2 = Promise.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("fiber", ({ promise }) =>
          (promise.succeed(undefined) > awaiter1.await())
            .ensuring(awaiter2.await())
            .disconnect()
            .fork()
        )
        .tap(({ promise }) => promise.await())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()
      await awaiter1.succeed(undefined).unsafeRunPromise()
      await awaiter2.succeed(undefined).unsafeRunPromise()

      expect(result.isInterrupted()).toBe(true)
    })

    it("disconnected effect that is then interrupted eventually performs interruption", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise1", () => Promise.make<never, void>())
        .bind("promise2", () => Promise.make<never, void>())
        .bind("fiber", ({ promise1, promise2, ref }) =>
          (promise1.succeed(undefined) > Effect.never)
            .ensuring(
              ref.set(true) > Effect.sleep(Duration(10)) > promise2.succeed(undefined)
            )
            .disconnect()
            .fork()
        )
        .tap(({ promise1 }) => promise1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ promise2 }) => promise2.await())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("cause reflects interruption", async () => {
      const program = withLatch((release) =>
        (release > Effect.fail("foo")).fork()
      ).flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      const isInterruptedOnly = result.isFailure() && result.cause.isInterruptedOnly()
      if (isInterruptedOnly) {
        expect(isInterruptedOnly).toBe(true)
      } else {
        expect(result.untraced()).toEqual(Exit.fail("foo"))
      }
    })

    it("acquireRelease use inherits interrupt status", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatchAwait(
            (release2, await2) =>
              withLatch((release1) =>
                Effect.acquireReleaseWithDiscard(
                  release1,
                  await2 > Effect.sleep(Duration(10)) > ref.set(true),
                  Effect.unit
                )
                  .uninterruptible()
                  .fork()
              ) < release2
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("acquireRelease use inherits interrupt status 2", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Promise.make<never, void>())
        .bind("latch2", () => Promise.make<never, void>())
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ latch1, latch2, ref }) =>
          Effect.acquireReleaseWith(
            latch1.succeed(undefined),
            () => latch2.await() > Effect.sleep(Duration(10)) > ref.set(true).asUnit(),
            () => Effect.unit
          )
            .uninterruptible()
            .fork()
        )
        .tap(({ latch1 }) => latch1.await())
        .tap(({ latch2 }) => latch2.succeed(undefined))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("async can be uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatch((release) =>
            (release > Effect.sleep(Duration(10)) > ref.set(true).asUnit())
              .uninterruptible()
              .fork()
          )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("closing scope is uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("promise", () => Promise.make<never, void>())
        .bindValue(
          "child",
          ({ promise, ref }) =>
            promise.succeed(undefined) > Effect.sleep(Duration(10)) > ref.set(true)
        )
        .bindValue(
          "parent",
          ({ child, promise }) => child.uninterruptible().fork() > promise.await()
        )
        .bind("fiber", ({ parent }) => parent.fork())
        .tap(({ promise }) => promise.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("effectAsyncInterrupt cancelation", async () => {
      const program = Effect.Do()
        .bind("ref", () => Effect.succeed(new AtomicNumber(0)))
        .bindValue("effect", ({ ref }) =>
          Effect.asyncInterrupt(() => {
            ref.incrementAndGet()
            return Either.left(Effect.succeed(ref.decrementAndGet()))
          })
        )
        .tap(({ effect }) => Effect.unit.race(effect))
        .flatMap(({ ref }) => Effect.succeed(ref.get))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })
})
