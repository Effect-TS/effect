import { withLatch, withLatchAwait } from "@effect/core/test/test-utils/Latch"
import { constTrue, constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("RTS interruption", () => {
    it("sync forever is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.succeed(1).forever().fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(constTrue)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interrupt of never is interrupted with cause", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.never.fork())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isFailure() && result.cause.isInterruptedOnly)
    })

    it("asyncEffect is interruptible", async () => {
      const program = Effect.Do()
        .bind(
          "fiber",
          () => Effect.asyncEffect<never, unknown, unknown, never, never, never>(() => Effect.never).fork()
        )
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("async is interruptible", async () => {
      const program = Effect.Do()
        .bind("fiber", () => Effect.async<never, never, void>(constVoid).fork())
        .flatMap(({ fiber }) => fiber.interrupt())
        .map(() => 42)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("acquireUseRelease is uninterruptible", async () => {
      const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred }) =>
          Effect.acquireUseRelease(
            deferred.succeed(undefined) < awaiter.await(),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon())
        .flatMap(
          ({ deferred, fiber }) =>
            deferred.await() >
              fiber.interrupt().timeoutTo(42, () => 0, (1).seconds)
        )

      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("acquireUseReleaseExit is uninterruptible", async () => {
      const awaiter = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred }) =>
          Effect.acquireUseRelease(
            deferred.succeed(undefined) > awaiter.await() > Effect.succeed(1),
            () => Effect.unit,
            () => Effect.unit
          ).forkDaemon())
        .flatMap(
          ({ deferred, fiber }) =>
            deferred.await() >
              fiber.interrupt().timeoutTo(42, () => 0, (1).seconds)
        )

      const result = await program.unsafeRunPromise()
      await awaiter.succeed(undefined).unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("acquireUseRelease use is interruptible", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("acquireUseReleaseExit use is interruptible", async () => {
      const program = Effect.acquireUseReleaseExit(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .fork()
        .flatMap((fiber) => fiber.interrupt().timeoutTo(42, () => 0, (1).seconds))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("acquireUseRelease release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2 }) =>
          Effect.acquireUseRelease(
            Effect.unit,
            () => deferred1.succeed(undefined) > Effect.never,
            () => deferred2.succeed(undefined) > Effect.unit
          ).fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ deferred2 }) => deferred2.await())
        .timeoutTo(42, () => 0, (1).seconds)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("acquireUseReleaseExit release called on interrupt", async () => {
      const program = Effect.Do()
        .bind("done", () => Deferred.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireUseReleaseExit(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            ).fork()
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) => done.await().timeoutTo(42, () => 0, (60).seconds))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    }, 180000)

    it("acquireUseRelease acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, number>())
        .bind("deferred3", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2, deferred3 }) =>
          Effect.acquireUseRelease(
            deferred1.succeed(undefined) > deferred2.await(),
            () => Effect.unit,
            () => deferred3.await()
          )
            .disconnect()
            .fork())
        .tap(({ deferred1 }) => deferred1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ deferred3 }) => deferred3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("acquireUseReleaseExit disconnect acquire returns immediately on interrupt", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("deferred3", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2, deferred3 }) =>
          Effect.acquireUseReleaseExit(
            deferred1.succeed(undefined) > deferred2.await(),
            () => Effect.unit,
            () => deferred3.await()
          )
            .disconnect()
            .fork())
        .tap(({ deferred1 }) => deferred1.await())
        .bind("result", ({ fiber }) => fiber.interrupt())
        .tap(({ deferred3 }) => deferred3.succeed(undefined))

      const { result } = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("acquireUseRelease disconnect use is interruptible", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .disconnect()
        .fork()
        .flatMap((fiber) => fiber.interrupt())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("acquireUseReleaseExit disconnect use is interruptible", async () => {
      const program = Effect.acquireUseReleaseExit(
        Effect.unit,
        () => Effect.never,
        () => Effect.unit
      )
        .disconnect()
        .fork()
        .flatMap((fiber) => fiber.interrupt().timeoutTo(42, () => 0, (1).seconds))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("acquireUseRelease disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2 }) =>
          Effect.acquireUseRelease(
            Effect.unit,
            () => deferred1.succeed(undefined) > Effect.never,
            () => deferred2.succeed(undefined) > Effect.unit
          )
            .disconnect()
            .fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ deferred2 }) => deferred2.await())
        .timeoutTo(false, () => true, (10).seconds)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("acquireUseReleaseExit disconnect release called on interrupt in separate fiber", async () => {
      const program = Effect.Do()
        .bind("done", () => Deferred.make<never, void>())
        .bind("fiber", ({ done }) =>
          withLatch((release) =>
            Effect.acquireUseReleaseExit(
              Effect.unit,
              () => release > Effect.never,
              () => done.succeed(undefined)
            )
              .disconnect()
              .fork()
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ done }) => done.await().timeoutTo(false, () => true, (10).seconds))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("catchAll + ensuring + interrupt", async () => {
      const program = Effect.Do()
        .bind("cont", () => Deferred.make<never, void>())
        .bind("deferred", () => Deferred.make<never, boolean>())
        .bind("fiber", ({ cont, deferred }) =>
          (cont.succeed(undefined) > Effect.never)
            .catchAll(Effect.failNow)
            .ensuring(deferred.succeed(true))
            .fork())
        .tap(({ cont }) => cont.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ deferred }) => deferred.await())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("finalizer can detect interruption", async () => {
      const program = Effect.Do()
        .bind("deferred1", () => Deferred.make<never, boolean>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2 }) =>
          (deferred2.succeed(undefined) > Effect.never)
            .ensuring(
              Effect.descriptor.flatMap((descriptor) => deferred1.succeed(descriptor.interrupters.size > 0))
            )
            .fork())
        .tap(({ deferred2 }) => deferred2.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ deferred1 }) => deferred1.await())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("interrupted cause persists after catching", async () => {
      function process(list: List<Exit<never, any>>): List<Exit<never, any>> {
        return list.map((exit) => exit.mapErrorCause((cause) => cause.untraced))
      }

      const program = Effect.Do()
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("exits", () => Ref.make<List<Exit<never, any>>>(List.empty()))
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
          ))
        .tap(({ fiber, latch1 }) => latch1.await() > fiber.interrupt())
        .flatMap(({ exits }) => exits.get().map(process))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.length, 2)
      assert.isTrue(
        result.reduce(
          true,
          (acc, curr) => acc && curr.isFailure() && curr.cause.isInterruptedOnly
        )
      )
    })

    it("interruption of raced", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<number>(0))
        .bind("cont1", () => Deferred.make<never, void>())
        .bind("cont2", () => Deferred.make<never, void>())
        .bindValue(
          "make",
          ({ ref }) =>
            (p: Deferred<never, void>) =>
              (p.succeed(undefined) > Effect.never).onInterrupt(() => ref.update((n) => n + 1))
        )
        .bind("raced", ({ cont1, cont2, make }) => make(cont1).race(make(cont2)).fork())
        .tap(({ cont1, cont2 }) => cont1.await() > cont2.await())
        .tap(({ raced }) => raced.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 2)
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
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("recovery of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(false))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .foldCauseEffect(
                (cause) => recovered.set(cause.isInterrupted),
                () => recovered.set(false)
              )
              .uninterruptible()
              .fork()
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
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
                  Option.some(either.mapLeft((cause) => cause.isInterrupted))
                )
              )
              .uninterruptible()
              .fork()
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(Either.left(true)))
    })

    it("run of interruptible", async () => {
      const program = Effect.Do()
        .bind("recovered", () => Ref.make(Option.emptyOf<boolean>()))
        .bind("fiber", ({ recovered }) =>
          withLatch((release) =>
            (release > Effect.never.interruptible())
              .exit()
              .flatMap((exit) => recovered.set(Option.some(exit.isInterrupted)))
              .uninterruptible()
              .fork()
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ recovered }) => recovered.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(true))
    })

    it("alternating interruptibility", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make<number>(0))
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
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ counter }) => counter.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 2)
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
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
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
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("disconnect returns immediately on interrupt", async () => {
      const awaiter1 = Deferred.unsafeMake<never, void>(FiberId.none)
      const awaiter2 = Deferred.unsafeMake<never, void>(FiberId.none)
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred }) =>
          (deferred.succeed(undefined) > awaiter1.await())
            .ensuring(awaiter2.await())
            .disconnect()
            .fork())
        .tap(({ deferred }) => deferred.await())
        .flatMap(({ fiber }) => fiber.interrupt())

      const result = await program.unsafeRunPromise()
      await awaiter1.succeed(undefined).unsafeRunPromise()
      await awaiter2.succeed(undefined).unsafeRunPromise()

      assert.isTrue(result.isInterrupted)
    })

    it("disconnected effect that is then interrupted eventually performs interruption", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bind("fiber", ({ deferred1, deferred2, ref }) =>
          (deferred1.succeed(undefined) > Effect.never)
            .ensuring(
              ref.set(true) > Effect.sleep((10).millis) > deferred2.succeed(undefined)
            )
            .disconnect()
            .fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ deferred2 }) => deferred2.await())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("cause reflects interruption", async () => {
      const program = withLatch((release) => (release > Effect.fail("foo")).fork()).flatMap((fiber) =>
        fiber.interrupt()
      )

      const result = await program.unsafeRunPromise()

      const isInterruptedOnly = result.isFailure() && result.cause.isInterruptedOnly
      if (isInterruptedOnly) {
        assert.isTrue(isInterruptedOnly)
      } else {
        assert.isTrue(result.untraced == Exit.fail("foo"))
      }
    })

    it("acquireRelease use inherits interrupt status", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ ref }) =>
          withLatchAwait(
            (release2, await2) =>
              withLatch((release1) =>
                Effect.acquireUseReleaseDiscard(
                  release1,
                  await2 > Effect.sleep((10).millis) > ref.set(true),
                  Effect.unit
                )
                  .uninterruptible()
                  .fork()
              ) < release2
          ))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("acquireRelease use inherits interrupt status 2", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("ref", () => Ref.make(false))
        .bind("fiber", ({ latch1, latch2, ref }) =>
          Effect.acquireUseRelease(
            latch1.succeed(undefined),
            () => latch2.await() > Effect.sleep((10).millis) > ref.set(true).unit(),
            () => Effect.unit
          )
            .uninterruptible()
            .fork())
        .tap(({ latch1 }) => latch1.await())
        .tap(({ latch2 }) => latch2.succeed(undefined))
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("async can be uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind(
          "fiber",
          ({ ref }) =>
            withLatch((release) =>
              (release > Effect.sleep((10).millis) > ref.set(true).unit())
                .uninterruptible()
                .fork()
            )
        )
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("closing scope is uninterruptible", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("deferred", () => Deferred.make<never, void>())
        .bindValue(
          "child",
          ({ deferred, ref }) => deferred.succeed(undefined) > Effect.sleep((10).millis) > ref.set(true)
        )
        .bindValue(
          "parent",
          ({ child, deferred }) => child.uninterruptible().fork() > deferred.await()
        )
        .bind("fiber", ({ parent }) => parent.fork())
        .tap(({ deferred }) => deferred.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("effectAsyncInterrupt cancelation", async () => {
      const program = Effect.Do()
        .bind("ref", () => Effect.succeed(new AtomicNumber(0)))
        .bindValue("effect", ({ ref }) =>
          Effect.asyncInterrupt(() => {
            ref.incrementAndGet()
            return Either.left(Effect.succeed(ref.decrementAndGet()))
          }))
        .tap(({ effect }) => Effect.unit.race(effect))
        .flatMap(({ ref }) => Effect.succeed(ref.get))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })
  })
})
