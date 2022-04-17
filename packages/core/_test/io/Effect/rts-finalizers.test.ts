import { asyncExampleError, asyncUnit, ExampleError, ExampleErrorFail } from "@effect/core/test/io/Effect/test-utils";
import { constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("Effect", () => {
  describe.concurrent("RTS finalizers", () => {
    it("fail ensuring", async () => {
      let finalized = false;
      const program = Effect.fail(ExampleError).ensuring(
        Effect.succeed(() => {
          finalized = true;
        })
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      assert.isTrue(finalized);
    });

    it("fail on error", async () => {
      let finalized = false;
      const program = Effect.fail(ExampleError).onError((cause) =>
        Effect.succeed(() => {
          finalized = true;
        })
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      assert.isTrue(finalized);
    });

    it("finalizer errors not caught", async () => {
      const e2 = new Error("e2");
      const e3 = new Error("e3");
      const program = ExampleErrorFail.ensuring(Effect.die(e2))
        .ensuring(Effect.die(e3))
        .sandbox()
        .flip()
        .map((cause) => cause.untraced());

      const result = await program.unsafeRunPromise();

      const expectedCause = Cause.fail(ExampleError) + Cause.die(e2) + Cause.die(e3);

      assert.isTrue(result == expectedCause);
    });

    it("finalizer errors reported", async () => {
      let reported: Exit<never, number> | undefined;
      const program = Effect.succeed(42)
        .ensuring(Effect.die(ExampleError))
        .fork()
        .flatMap((fiber) =>
          fiber.await().flatMap((e) =>
            Effect.succeed(() => {
              reported = e;
            })
          )
        )
        .map(constTrue);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
      assert.isFalse(reported && reported.isSuccess());
    });

    it("acquireUseRelease exit is usage result", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.succeed(42),
        () => Effect.unit
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 42);
    });

    it("error in just acquisition", async () => {
      const program = Effect.acquireUseRelease(
        ExampleErrorFail,
        () => Effect.unit,
        () => Effect.unit
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("error in just release", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(ExampleError));
    });

    it("error in just usage", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.fail(ExampleError),
        () => Effect.unit
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("rethrown caught error in acquisition", async () => {
      const program = Effect.absolve(
        Effect.acquireUseRelease(
          ExampleErrorFail,
          () => Effect.unit,
          () => Effect.unit
        ).either()
      ).flip();

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, ExampleError);
    });

    it("rethrown caught error in release", async () => {
      const program = Effect.acquireUseRelease(
        Effect.unit,
        () => Effect.unit,
        () => Effect.die(ExampleError)
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(ExampleError));
    });

    it("rethrown caught error in usage", async () => {
      const program = Effect.absolve(
        Effect.acquireUseReleaseDiscard(
          Effect.unit,
          ExampleErrorFail,
          Effect.unit
        ).either()
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("test eval of async fail", async () => {
      const io1 = Effect.acquireUseReleaseDiscard(
        Effect.unit,
        asyncExampleError<void>(),
        asyncUnit<never>()
      );
      const io2 = Effect.acquireUseReleaseDiscard(
        asyncUnit<never>(),
        asyncExampleError<void>(),
        asyncUnit<never>()
      );
      const program = Effect.Do()
        .bind("a1", () => io1.exit().map((exit) => exit.untraced()))
        .bind("a2", () => io2.exit().map((exit) => exit.untraced()))
        .bind("a3", () =>
          Effect.absolve(io1.either())
            .exit()
            .map((exit) => exit.untraced()))
        .bind("a4", () =>
          Effect.absolve(io2.either())
            .exit()
            .map((exit) => exit.untraced()));

      const { a1, a2, a3, a4 } = await program.unsafeRunPromise();

      assert.isTrue(a1 == Exit.fail(ExampleError));
      assert.isTrue(a2 == Exit.fail(ExampleError));
      assert.isTrue(a3 == Exit.fail(ExampleError));
      assert.isTrue(a4 == Exit.fail(ExampleError));
    });

    it("acquireReleaseWith regression 1", async () => {
      function makeLogger(ref: Ref<List<string>>) {
        return (line: string): Effect.UIO<void> => ref.update((list) => list + List(line));
      }

      const program = Effect.Do()
        .bind("ref", () => Ref.make<List<string>>(List.empty()))
        .bindValue("log", ({ ref }) => makeLogger(ref))
        .bind("fiber", ({ log }) =>
          Effect.acquireUseRelease(
            Effect.acquireUseRelease(
              Effect.unit,
              () => Effect.unit,
              () => log("start 1") > Effect.sleep((10).millis) > log("release 1")
            ),
            () => Effect.unit,
            () => log("start 2") > Effect.sleep((10).millis) > log("release 2")
          ).fork())
        .tap(({ ref }) =>
          (ref.get() < Effect.sleep((1).millis)).repeatUntil((list) => list.find((s) => s === "start 1").isSome())
        )
        .tap(({ fiber }) => fiber.interrupt())
        .tap(({ ref }) =>
          (ref.get() < Effect.sleep((1).millis)).repeatUntil((list) => list.find((s) => s === "release 2").isSome())
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.find((s) => s === "start 1").isSome());
      assert.isTrue(result.find((s) => s === "release 1").isSome());
      assert.isTrue(result.find((s) => s === "start 2").isSome());
      assert.isTrue(result.find((s) => s === "release 2").isSome());
    });

    it("interrupt waits for finalizer", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("deferred1", () => Deferred.make<never, void>())
        .bind("deferred2", () => Deferred.make<never, number>())
        .bind("fiber", ({ deferred1, deferred2, ref }) =>
          (deferred1.succeed(undefined) > deferred2.await())
            .ensuring(ref.set(true) > Effect.sleep((10).millis))
            .fork())
        .tap(({ deferred1 }) => deferred1.await())
        .tap(({ fiber }) => fiber.interrupt())
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
