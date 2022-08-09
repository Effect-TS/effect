import { withLatch, withLatchAwait } from "@effect/core/test/test-utils/Latch"
import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS interruption", () => {
    it("sync forever is interruptible", () =>
      Do(($) => {
        const fiber = $(Effect.succeed(1).forever.fork)
        const result = $(fiber.interrupt)
        assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
      }).unsafeRunPromise())

    it("interrupt of never is interrupted with cause", () =>
      Do(($) => {
        const fiber = $(Effect.never.fork)
        const result = $(fiber.interrupt)
        assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
      }).unsafeRunPromise())

    it("asyncEffect is interruptible", () =>
      Do(($) => {
        const fiber = $(
          Effect.asyncEffect<never, never, never, never, never, never>(() => Effect.never).fork
        )
        const result = $(fiber.interrupt)
        assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
      }).unsafeRunPromise())

    it("async is interruptible", () =>
      Do(($) => {
        const fiber = $(Effect.async<never, never, void>(constVoid).fork)
        const result = $(fiber.interrupt)
        assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
      }).unsafeRunPromise())

    it("acquireUseRelease is uninterruptible", async () => {
      const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseRelease(
            deferred.succeed(undefined).zipLeft(awaiter.await),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon
        )
        return $(deferred.await.zipRight(fiber.interrupt.timeoutTo(42, () => 0, (1).seconds)))
      })
      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()
      assert.strictEqual(result, 42)
    })

    it("acquireUseReleaseExit is uninterruptible", async () => {
      const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseRelease(
            deferred.succeed(undefined) > awaiter.await > Effect.sync(1),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon
        )
        return $(deferred.await.zipRight(fiber.interrupt.timeoutTo(42, () => 0, (1).seconds)))
      })
      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()
      assert.strictEqual(result, 42)
    })

    it("acquireUseRelease use is interruptible", () =>
      Do(($) => {
        const fiber = $(
          Effect.acquireUseRelease(Effect.unit, () => Effect.never, () => Effect.unit).fork
        )
        const result = $(fiber.interrupt)
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())

    it("acquireUseReleaseExit use is interruptible", () =>
      Do(($) => {
        const fiber = $(
          Effect.acquireUseReleaseExit(Effect.unit, () => Effect.never, () => Effect.unit).fork
        )
        const result = $(fiber.interrupt.timeoutTo(42, () => 0, (1).seconds))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("acquireUseRelease release called on interrupt", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => deferred1.succeed(undefined).zipRight(Effect.never),
            () => deferred2.succeed(undefined).zipRight(Effect.unit)
          ).fork
        )
        $(deferred1.await)
        $(fiber.interrupt)
        const result = $(deferred2.await.timeoutTo(42, () => 0, (1).seconds))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("acquireUseReleaseExit release called on interrupt", () =>
      Do(($) => {
        const done = $(Deferred.make<never, void>())
        const fiber = $(
          withLatch((release) =>
            Effect.acquireUseReleaseExit(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            ).fork
          )
        )
        $(fiber.interrupt)
        const result = $(done.await.timeoutTo(42, () => 0, (60).seconds))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("acquireUseRelease acquire returns immediately on interrupt", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, number>())
        const deferred3 = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseRelease(
            deferred1.succeed(undefined).zipRight(deferred2.await),
            () => Effect.unit,
            () => deferred3.await
          ).disconnect.fork
        )
        $(deferred1.await)
        const result = $(fiber.interrupt)
        $(deferred3.succeed(undefined))
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())

    it("acquireUseReleaseExit disconnect acquire returns immediately on interrupt", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, number>())
        const deferred3 = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseReleaseExit(
            deferred1.succeed(undefined).zipRight(deferred2.await),
            () => Effect.unit,
            () => deferred3.await
          ).disconnect.fork
        )
        $(deferred1.await)
        const result = $(fiber.interrupt)
        $(deferred3.succeed(undefined))
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())

    it("acquireUseRelease disconnect use is interruptible", () =>
      Do(($) => {
        const fiber = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => Effect.never,
            () => Effect.unit
          ).disconnect.fork
        )
        const result = $(fiber.interrupt)
        assert.isTrue(result.isInterrupted)
      }).unsafeRunPromise())

    it("acquireUseReleaseExit disconnect use is interruptible", () =>
      Do(($) => {
        const fiber = $(
          Effect.acquireUseReleaseExit(
            Effect.unit,
            () => Effect.never,
            () => Effect.unit
          ).disconnect.fork
        )
        const result = $(fiber.interrupt.timeoutTo(42, () => 0, (1).seconds))
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())

    it("acquireUseRelease disconnect release called on interrupt in separate fiber", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const fiber = $(
          Effect.acquireUseRelease(
            Effect.unit,
            () => deferred1.succeed(undefined) > Effect.never,
            () => deferred2.succeed(undefined) > Effect.unit
          ).disconnect.fork
        )
        $(deferred1.await)
        $(fiber.interrupt)
        const result = $(deferred2.await.timeoutTo(false, () => true, (10).seconds))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("acquireUseReleaseExit disconnect release called on interrupt in separate fiber", () =>
      Do(($) => {
        const done = $(Deferred.make<never, void>())
        const fiber = $(
          withLatch((release) =>
            Effect.acquireUseReleaseExit(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            ).disconnect.fork
          )
        )
        $(fiber.interrupt)
        const result = $(done.await.timeoutTo(false, () => true, (10).seconds))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("catchAll + ensuring + interrupt", () =>
      Do(($) => {
        const cont = $(Deferred.make<never, void>())
        const deferred = $(Deferred.make<never, boolean>())
        const fiber = $(
          cont.succeed(undefined)
            .zipRight(Effect.never)
            .catchAll(Effect.fail)
            .ensuring(deferred.succeed(true))
            .fork
        )
        $(cont.await)
        $(fiber.interrupt)
        const result = $(deferred.await)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("finalizer can detect interruption", () =>
      Do(($) => {
        const deferred1 = $(Deferred.make<never, boolean>())
        const deferred2 = $(Deferred.make<never, void>())
        const fiber = $(
          deferred2.succeed(undefined)
            .zipRight(Effect.never)
            .ensuring(Effect.descriptor.flatMap((descriptor) =>
              deferred1.succeed(descriptor.interrupters.size > 0)
            )).fork
        )
        $(deferred2.await)
        $(fiber.interrupt)
        const result = $(deferred1.await)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("interrupted cause persists after catching", () =>
      Do(($) => {
        function process(list: List<Exit<never, any>>): List<Exit<never, any>> {
          return list.map((exit) => exit.mapErrorCause((cause) => cause))
        }
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const exits = $(Ref.make(List.empty<Exit<never, any>>()))
        const fiber = $(
          Effect.uninterruptibleMask(({ restore }) =>
            restore(
              Effect.uninterruptibleMask(({ restore }) =>
                restore(latch1.succeed(undefined).zipRight(latch2.await)).onExit((exit) =>
                  exits.update((list) => list.prepend(exit))
                )
              ).zipRight(Effect.unit)
            ).exit.flatMap((exit) => exits.update((list) => list.prepend(exit))).fork
          )
        )
        $(latch1.await.zipRight(fiber.interrupt))
        const result = $(exits.get.map(process))
        assert.strictEqual(result.length, 2)
        assert.isTrue(
          result.reduce(
            true,
            (acc, curr) => acc && curr.isFailure() && curr.cause.isInterruptedOnly
          )
        )
      }).unsafeRunPromise())

    it("interruption of raced", () =>
      Do(($) => {
        const ref = $(Ref.make<number>(0))
        const cont1 = $(Deferred.make<never, void>())
        const cont2 = $(Deferred.make<never, void>())
        const make = (p: Deferred<never, void>) =>
          p.succeed(undefined).zipRight(Effect.never).onInterrupt(() => ref.update((n) => n + 1))
        const raced = $(make(cont1).race(make(cont2)).fork)
        $(cont1.await.zipRight(cont2.await))
        $(raced.interrupt)
        const result = $(ref.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("recovery of error in finalizer", () =>
      Do(($) => {
        const recovered = $(Ref.make(false))
        const fiber = $(
          withLatch((release) =>
            release.zipRight(Effect.never).ensuring(
              Effect.unit.zipRight(Effect.failSync("uh oh")).catchAll(() => recovered.set(true))
            ).fork
          )
        )
        $(fiber.interrupt)
        const result = $(recovered.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("recovery of interruptible", () =>
      Do(($) => {
        const recovered = $(Ref.make(false))
        const fiber = $(withLatch((release) =>
          release.zipRight(Effect.never.interruptible)
            .foldCauseEffect(
              (cause) => recovered.set(cause.isInterrupted),
              () => recovered.set(false)
            ).uninterruptible.fork
        ))
        $(fiber.interrupt)
        const result = $(recovered.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("sandbox of interruptible", () =>
      Do(($) => {
        const recovered = $(Ref.make(Maybe.empty<Either<boolean, any>>()))
        const fiber = $(
          withLatch((release) =>
            release.zipRight(Effect.never.interruptible).sandbox.either
              .flatMap((either) =>
                recovered.set(Maybe.some(either.mapLeft((cause) => cause.isInterrupted)))
              ).uninterruptible.fork
          )
        )
        $(fiber.interrupt)
        const result = $(recovered.get)
        assert.isTrue(result == Maybe.some(Either.left(true)))
      }).unsafeRunPromise())

    it("run of interruptible", () =>
      Do(($) => {
        const recovered = $(Ref.make(Maybe.empty<boolean>()))
        const fiber = $(
          withLatch((release) =>
            release.zipRight(Effect.never.interruptible)
              .exit
              .flatMap((exit) => recovered.set(Maybe.some(exit.isInterrupted)))
              .uninterruptible
              .fork
          )
        )
        $(fiber.interrupt)
        const result = $(recovered.get)
        assert.isTrue(result == Maybe.some(true))
      }).unsafeRunPromise())

    it("alternating interruptibility", () =>
      Do(($) => {
        const counter = $(Ref.make(0))
        const fiber = $(
          withLatch((release) =>
            release
              .zipRight(Effect.never.interruptible.exit)
              .zipRight(counter.update((n) => n + 1))
              .uninterruptible
              .interruptible
              .exit.zipRight(counter.update((n) => n + 1))
              .uninterruptible
              .fork
          )
        )
        $(fiber.interrupt)
        const result = $(counter.get)
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("interruption after defect", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const fiber = $(
          withLatch((release) =>
            Effect.attempt(() => {
              throw new Error()
            })
              .exit
              .zipRight(release)
              .zipRight(Effect.never)
              .ensuring(ref.set(true))
              .fork
          )
        )
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("interruption after defect 2", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const fiber = $(
          withLatch((release) =>
            Effect.attempt(() => {
              throw new Error()
            })
              .exit
              .zipRight(release)
              .zipRight(Effect.unit.forever)
              .ensuring(ref.set(true))
              .fork
          )
        )
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("disconnect returns immediately on interrupt", async () => {
      const awaiter1 = Deferred.unsafeMake<never, void>(FiberId.none)
      const awaiter2 = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const fiber = $(
          deferred.succeed(undefined)
            .zipRight(awaiter1.await)
            .ensuring(awaiter2.await)
            .disconnect
            .fork
        )
        $(deferred.await)
        return $(fiber.interrupt)
      })
      const result = await program.unsafeRunPromise()
      await awaiter1.succeed(undefined).unsafeRunPromise()
      await awaiter2.succeed(undefined).unsafeRunPromise()
      assert.isTrue(result.isInterrupted)
    })

    it("disconnected effect that is then interrupted eventually performs interruption", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const deferred1 = $(Deferred.make<never, void>())
        const deferred2 = $(Deferred.make<never, void>())
        const fiber = $(
          deferred1.succeed(undefined)
            .zipRight(Effect.never)
            .ensuring(
              ref.set(true).zipRight(Effect.sleep((10).millis)).zipRight(
                deferred2.succeed(undefined)
              )
            ).disconnect.fork
        )
        $(deferred1.await)
        $(fiber.interrupt)
        $(deferred2.await)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("cause reflects interruption", () =>
      Do(($) => {
        const result = $(
          withLatch((release) => release.zipRight(Effect.failSync("foo")).fork)
            .flatMap((fiber) => fiber.interrupt)
        )
        assert.isTrue(
          result.isFailure() && result.cause.isInterruptedOnly || result == Exit.fail("foo")
        )
      }).unsafeRunPromise())

    it("acquireRelease use inherits interrupt status", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const fiber = $(
          withLatchAwait(
            (release2, await2) =>
              withLatch((release1) =>
                Effect.acquireUseReleaseDiscard(
                  release1,
                  await2.zipRight(Effect.sleep((10).millis)).zipRight(ref.set(true)),
                  Effect.unit
                ).uninterruptible.fork
              ).zipLeft(release2)
          )
        )
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("acquireRelease use inherits interrupt status 2", () =>
      Do(($) => {
        const latch1 = $(Deferred.make<never, void>())
        const latch2 = $(Deferred.make<never, void>())
        const ref = $(Ref.make(false))
        const fiber = $(
          Effect.acquireUseRelease(
            latch1.succeed(undefined),
            () => latch2.await.zipRight(Effect.sleep((10).millis)).zipRight(ref.set(true)).unit,
            () => Effect.unit
          ).uninterruptible.fork
        )
        $(latch1.await)
        $(latch2.succeed(undefined))
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("async can be uninterruptible", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const fiber = $(withLatch((release) =>
          release
            .zipRight(Effect.sleep((10).millis))
            .zipRight(ref.set(true).unit)
            .uninterruptible
            .fork
        ))
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("closing scope is uninterruptible", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const deferred = $(Deferred.make<never, void>())
        const child = deferred.succeed(undefined)
          .zipRight(Effect.sleep((10).millis))
          .zipRight(ref.set(true))
        const parent = child.uninterruptible.fork.zipRight(deferred.await)
        const fiber = $(parent.fork)
        $(deferred.await)
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("effectAsyncInterrupt cancelation", () =>
      Do(($) => {
        const ref = $(Effect.sync(new AtomicNumber(0)))
        const effect = Effect.asyncInterrupt(() => {
          ref.incrementAndGet()
          return Either.left(Effect.sync(ref.decrementAndGet()))
        })
        $(Effect.unit.race(effect))
        const result = ref.get
        assert.strictEqual(result, 0)
      }).unsafeRunPromise())
  })
})
