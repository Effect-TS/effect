import { concurrentFib, ExampleError, fib } from "@effect/core/test/io/Effect/test-utils";
import { withLatch } from "@effect/core/test/test-utils/Latch";

describe.concurrent("Effect", () => {
  describe.concurrent("RTS concurrency correctness", () => {
    it("shallow fork/join identity", async () => {
      const program = Effect.succeed(42)
        .fork()
        .flatMap((fiber) => fiber.join());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("deep fork/join identity", async () => {
      const result = await concurrentFib(20).unsafeRunPromise();

      assert.strictEqual(result, fib(20));
    });

    it("asyncEffect creation is interruptible", async () => {
      const program = Effect.Do()
        .bind("release", () => Deferred.make<never, number>())
        .bind("acquire", () => Deferred.make<never, void>())
        .bindValue("task", ({ acquire, release }) =>
          Effect.asyncEffect((cb) =>
            // This will never complete because the callback is never invoked
            Effect.acquireUseRelease(
              acquire.succeed(undefined),
              () => Effect.never,
              () => release.succeed(42).asUnit()
            )
          ))
        .bind("fiber", ({ task }) => task.fork())
        .tap(({ acquire }) => acquire.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ release }) => release.await());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("daemon fiber is unsupervised", async () => {
      function child(ref: Ref<boolean>) {
        return withLatch((release) => (release > Effect.never).ensuring(ref.set(true)));
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("fiber1", ({ ref }) => child(ref).forkDaemon().fork())
        .bind("fiber2", ({ fiber1 }) => fiber1.join())
        .bind("result", ({ ref }) => ref.get())
        .tap(({ fiber2 }) => fiber2.interrupt());

      const { result } = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("daemon fiber race interruption", async () => {
      function plus1<X>(latch: Deferred<never, void>, finalizer: Effect.UIO<X>) {
        return (
          latch.succeed(undefined) > Effect.sleep((1).hours)
        ).onInterrupt(() => finalizer.map((x) => x));
      }

      const program = Effect.Do()
        .bind("interruptionRef", () => Ref.make(0))
        .bind("latch1Start", () => Deferred.make<never, void>())
        .bind("latch2Start", () => Deferred.make<never, void>())
        .bindValue("inc", ({ interruptionRef }) => interruptionRef.updateAndGet((n) => n + 1))
        .bindValue("left", ({ inc, latch1Start }) => plus1(latch1Start, inc))
        .bindValue("right", ({ inc, latch2Start }) => plus1(latch2Start, inc))
        .bind("fiber", ({ left, right }) => left.race(right).fork())
        .tap(
          ({ fiber, latch1Start, latch2Start }) => latch1Start.await() > latch2Start.await() > fiber.interrupt()
        )
        .flatMap(({ interruptionRef }) => interruptionRef.get());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 2);
    });

    it("race in daemon is executed", async () => {
      const program = Effect.Do()
        .bind("latch1", () => Deferred.make<never, void>())
        .bind("latch2", () => Deferred.make<never, void>())
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, void>())
        .bindValue("loser1", ({ deferred1, latch1 }) =>
          Effect.acquireUseRelease(
            latch1.succeed(undefined),
            () => Effect.never,
            () => deferred1.succeed(undefined)
          ))
        .bindValue("loser2", ({ deferred2, latch2 }) =>
          Effect.acquireUseRelease(
            latch2.succeed(undefined),
            () => Effect.never,
            () => deferred2.succeed(undefined)
          ))
        .bind("fiber", ({ loser1, loser2 }) => loser1.race(loser2).forkDaemon())
        .tap(({ latch1 }) => latch1.await())
        .tap(({ latch2 }) => latch2.await())
        .tap(({ fiber }) => fiber.interrupt())
        .bind("res1", ({ deferred1 }) => deferred1.await())
        .bind("res2", ({ deferred2 }) => deferred2.await());

      const { res1, res2 } = await program.unsafeRunPromise();

      assert.isUndefined(res1);
      assert.isUndefined(res2);
    });

    it("supervise fibers", async () => {
      function makeChild(n: number): Effect.UIO<Fiber<never, void>> {
        return (Effect.sleep(new Duration(20 * n)) > Effect.never).fork();
      }

      const program = Ref.make(0)
        .tap((ref) =>
          (makeChild(1) > makeChild(2)).ensuringChildren((fs) =>
            fs.reduce(
              Effect.unit,
              (acc, fiber) => acc > fiber.interrupt() > ref.update((n) => n + 1)
            )
          )
        )
        .flatMap((ref) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 2);
    });

    it("race of fail with success", async () => {
      const program = Effect.fail(42).race(Effect.succeed(24)).either();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.right(24));
    });

    it("race of terminate with success", async () => {
      const program = Effect.die(new Error()).race(Effect.succeed(24));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 24);
    });

    it("race of fail with fail", async () => {
      const program = Effect.fail(42).race(Effect.fail(24)).either();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left(42));
    });

    it("race of value and never", async () => {
      const program = Effect.succeed(42).race(Effect.never);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("race in uninterruptible region", async () => {
      const deferred = Deferred.unsafeMake<never, void>(FiberId.none);
      const program = Effect.unit.race(deferred.await()).uninterruptible();

      const result = await program.unsafeRunPromise();
      await deferred.succeed(undefined).unsafeRunPromise();

      assert.isUndefined(result);
    });

    it("race of two forks does not interrupt winner", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("fibers", () => Ref.make(HashSet.empty<Fiber<unknown, unknown>>()))
        .bind("latch", () => Deferred.make<never, void>())
        .bindValue(
          "effect",
          ({ fibers, latch, ref }) =>
            Effect.uninterruptibleMask(({ restore }) =>
              restore(latch.await().onInterrupt(() => ref.update((n) => n + 1)))
                .fork()
                .tap((fiber) => fibers.update((set) => set.add(fiber)))
            )
        )
        .bindValue("awaitAll", ({ fibers }) => fibers.get().flatMap((set) => Fiber.awaitAll(set)))
        .tap(({ effect }) => effect.race(effect))
        .flatMap(
          ({ awaitAll, latch, ref }) => latch.succeed(undefined) > awaitAll > ref.get()
        );

      const result = await program.unsafeRunPromise();

      assert.isAtMost(result, 1);
    });

    it("firstSuccessOf of values", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0),
        Effect.succeed(100)
      ]).either();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.right(100));
    });

    it("firstSuccessOf of failures", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0).delay((10).millis),
        Effect.fail(101)
      ]).either();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left(101));
    });

    it("firstSuccessOf of failures & 1 success", async () => {
      const program = Effect.firstSuccessOf([
        Effect.fail(0),
        Effect.succeed(102).delay((1).millis)
      ]).either();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.right(102));
    });

    it("raceFirst interrupts loser on success", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("effect", () => Deferred.make<never, number>())
        .bindValue("winner", () => Effect.fromEither(Either.right(undefined)))
        .bindValue("loser", ({ deferred, effect }) =>
          Effect.acquireUseRelease(
            deferred.succeed(undefined),
            () => Effect.never,
            () => effect.succeed(42)
          ))
        .bindValue("race", ({ loser, winner }) => winner.raceFirst(loser))
        .tap(({ race }) => race)
        .flatMap(({ effect }) => effect.await());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("raceFirst interrupts loser on failure", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("effect", () => Deferred.make<never, number>())
        .bindValue(
          "winner",
          ({ deferred }) => deferred.await() > Effect.fromEither(Either.left(new Error()))
        )
        .bindValue("loser", ({ deferred, effect }) =>
          Effect.acquireUseRelease(
            deferred.succeed(undefined),
            () => Effect.never,
            () => effect.succeed(42)
          ))
        .bindValue("race", ({ loser, winner }) => winner.raceFirst(loser))
        .tap(({ race }) => race.either())
        .flatMap(({ effect }) => effect.await());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("mergeAll", async () => {
      const program = Effect.mergeAll(
        List("a", "aa", "aaa", "aaaa").map(Effect.succeedNow),
        0,
        (b, a) => b + a.length
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });

    it("mergeAll - empty", async () => {
      const program = Effect.mergeAll(List.empty<Effect.UIO<number>>(), 0, (b, a) => b + a);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 0);
    });

    it("reduceAll", async () => {
      const program = Effect.reduceAll(
        Effect.succeed(1),
        List(2, 3, 4).map(Effect.succeedNow),
        (acc, a) => acc + a
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });

    it("reduceAll - empty list", async () => {
      const program = Effect.reduceAll(
        Effect.succeed(1),
        List.empty<Effect.UIO<number>>(),
        (acc, a) => acc + a
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });

    it("timeout of failure", async () => {
      const program = Effect.fail("uh oh").timeout((1).hours);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("uh oh"));
    });

    it("timeout of terminate", async () => {
      const program = Effect.die(ExampleError).timeout((1).hours);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(ExampleError));
    });
  });
});
