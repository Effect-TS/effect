import { chain, HasSTMEnv, STMEnv } from "@effect/core/test/stm/STM/test-utils";
import { constVoid } from "@tsplus/stdlib/data/Function";

describe.concurrent("STM", () => {
  describe.concurrent("orElse", () => {
    it("tries alternative once left retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.retry)
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 200);
    });

    it("tries alternative once left fails", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.fail("boom"))
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 200);
    });

    it("fail if alternative fails", async () => {
      const program = (STM.fail("left") | STM.fail("right")).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("right"));
    });
  });

  describe.concurrent("orElseEither", () => {
    it("returns result of the first successful transaction wrapped in either", async () => {
      const program = Effect.struct({
        rightValue: STM.retry.orElseEither(STM.succeed(42)).commit(),
        leftValue1: STM.succeed(1).orElseEither(STM.succeed("nope")).commit(),
        leftValue2: STM.succeed(2).orElseEither(STM.retry).commit()
      });

      const { leftValue1, leftValue2, rightValue } = await program.unsafeRunPromise();

      assert.isTrue(rightValue == Either.right(42));
      assert.isTrue(leftValue1 == Either.left(1));
      assert.isTrue(leftValue2 == Either.left(2));
    });
  });

  describe.concurrent("orElseFail", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseFail(false).commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("fails with the specified error once left retries", async () => {
      const program = STM.retry.orElseFail(false).either().commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left(false));
    });

    it("fails with the specified error once left fails", async () => {
      const program = STM.fail(true).orElseFail(false).either().commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Either.left(false));
    });
  });

  describe.concurrent("orElseSucceed", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseSucceed(false).commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("succeeds with the specified value if left retries", async () => {
      const program = STM.retry.orElseSucceed(false).commit();

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("succeeds with the specified value if left fails", async () => {
      const program = STM.fail(true).orElseSucceed(false).commit();

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });
  });

  describe.concurrent("alternative", () => {
    it("succeeds if left succeeds", async () => {
      const program = STM.succeed("left").orTry(STM.succeed("right")).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "left");
    });

    it("succeeds if right succeeds", async () => {
      const program = STM.retry.orTry(STM.succeed("right")).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "right");
    });

    it("retries left after right retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.get().flatMap((n) => STM.check(n > 500).as("left")))
        .bindValue("right", () => STM.retry)
        .bindValue("updater", ({ tRef }) =>
          tRef
            .update((n) => n + 10)
            .commit()
            .forever())
        .flatMap(({ left, right, updater }) => left.orTry(right).commit().race(updater));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "left");
    });

    it("fails if left fails", async () => {
      const program = STM.fail("left").orTry(STM.succeed("right")).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("left"));
    });

    it("fails if right fails", async () => {
      const program = STM.retry.orTry(STM.fail("right")).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("right"));
    });
  });

  describe.concurrent("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42;
      const nonZero = 43;
      const program = STM.mergeAll(
        List.empty<STM<unknown, never, number>>(),
        zeroElement,
        () => nonZero
      ).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, zeroElement);
    });

    it("merge list using function", async () => {
      const program = STM.mergeAll(
        List(3, 5, 7).map(STM.succeedNow),
        1,
        (a, b) => a + b
      ).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1 + 3 + 5 + 7);
    });

    it("return error if it exists in list", async () => {
      const program = STM.mergeAll(
        List(STM.unit, STM.fail(1)),
        undefined,
        constVoid
      ).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(1));
    });
  });

  describe.concurrent("reduceAll", () => {
    it("should reduce all elements to a single value", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List(2, 3, 4).map(STM.succeedNow),
        (acc, a) => acc + a
      ).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });

    it("should handle an empty iterable", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List.empty<STM<unknown, never, number>>(),
        (acc, a) => acc + a
      ).commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });
  });

  describe.concurrent("validate", () => {
    it("returns all errors if never valid", async () => {
      const input = Chunk.fill(10, () => 0);
      const program = STM.validate(input, STM.failNow).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(input));
    });

    it("accumulate errors and ignore successes", async () => {
      const input = Chunk.range(0, 9);
      const program = STM.validate(input, (n) => n % 2 === 0 ? STM.succeed(n) : STM.fail(n)).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(Chunk(1, 3, 5, 7, 9)));
    });

    it("accumulate successes", async () => {
      const input = Chunk.range(0, 9);
      const program = STM.validate(input, STM.succeedNow)
        .commit();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == input);
    });
  });

  describe.concurrent("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const input = Chunk.fill(10, () => 0);
      const program = STM.validateFirst(input, STM.failNow)
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(input));
    });

    it("runs sequentially and short circuits on first success validation", async () => {
      const input = Chunk.range(1, 9);
      const program = STM.Do()
        .bind("counter", () => TRef.make(0))
        .bind("result", ({ counter }) =>
          STM.validateFirst(
            input,
            (n) => counter.update((_) => _ + 1) > (n === 6 ? STM.succeed(n) : STM.fail(n))
          ))
        .bind("count", ({ counter }) => counter.get())
        .commit();

      const { count, result } = await program.unsafeRunPromise();

      assert.strictEqual(result, 6);
      assert.strictEqual(count, 6);
    });

    it("returns errors in correct order", async () => {
      const input = List(2, 4, 6, 3, 5, 6);
      const program = STM.validateFirst(input, STM.failNow).commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(input));
    });
  });

  describe.concurrent("when combinators", () => {
    it("when true", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(true, tRef.set(true)) > tRef.get()).commit());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("when false", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(false, tRef.set(true)) > tRef.get()).commit());

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });

    it("whenSTM true", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n === 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });

    it("whenSTM false", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n !== 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 0);
    });

    it("whenCase executes correct branch only", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCase(
            Option.emptyOf<number>(),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCase(Option.some(0), (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none)
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit();

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.isFalse(result1);
      assert.isTrue(result2);
    });

    it("whenCaseSTM executes condition effect and correct branch", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCaseSTM(
            STM.succeed(Option.emptyOf<number>()),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCaseSTM(
            STM.succeed(Option.some(0)),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit();

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.isFalse(result1);
      assert.isTrue(result2);
    });
  });

  describe.concurrent("regression tests", () => {
    it("read only STM shouldn't return partial state of concurrent read-write STM", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(0))
        .bind("tRef2", () => TRef.makeCommit(0))
        .bind("sumFiber", ({ tRef1, tRef2 }) =>
          tRef1
            .get()
            .flatMap((n1) => tRef2.get().map((n2) => n1 + n2))
            .commit()
            .fork())
        .tap(({ tRef1, tRef2 }) => (tRef1.update((n) => n + 1) > tRef2.update((n) => n + 1)).commit())
        .flatMap(({ sumFiber }) => sumFiber.join());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result === 0 || result === 2);
    });
  });

  describe.concurrent("STM stack safety", () => {
    it("long alternative chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry.orTry(tRef.getAndUpdate((n) => n + 1)))
        )
        .flatMap((tRef) => tRef.get())
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long map chains", async () => {
      const program = chain(10000, (stm) => stm.map((n) => n + 1));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long collect chains", async () => {
      const program = chain(10000, (stm) => stm.continueOrRetry((n) => Option.some(n + 1)));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long collectSTM chains", async () => {
      const program = chain(10000, (stm) => stm.continueOrRetrySTM((n) => Option.some(STM.succeed(n + 1))));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long flatMap chains", async () => {
      const program = chain(10000, (stm) => stm.flatMap((n) => STM.succeed(n + 1)));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long fold chains", async () => {
      const program = chain(10000, (stm) =>
        stm.fold(
          () => 0,
          (n) => n + 1
        ));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long foldSTM chains", async () => {
      const program = chain(10000, (stm) =>
        stm.foldSTM(
          () => STM.succeed(0),
          (n) => STM.succeed(n + 1)
        ));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long mapError chains", async () => {
      function chainError(depth: number): IO<number, never> {
        return chainErrorLoop(depth, STM.fail(0));
      }

      function chainErrorLoop(
        n: number,
        acc: STM<unknown, number, never>
      ): IO<number, never> {
        return n <= 0
          ? acc.commit()
          : Effect.suspendSucceed(
            chainErrorLoop(
              n - 1,
              acc.mapError((n) => n + 1)
            )
          );
      }

      const program = chainError(10000);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(10000));
    });

    it("long orElse chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry | tRef.getAndUpdate((n) => n + 1))
        )
        .flatMap((tRef) => tRef.get())
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10000);
    });

    it("long provide chains", async () => {
      const program = chain(10000, (stm) => stm.provideEnvironment(0));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 0);
    });
  });

  describe.concurrent("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .commit()
            .provideEnvironment(HasSTMEnv(env))
        )
        .flatMap((env) => env.ref.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(HasSTMEnv(env))
            .commit()
        )
        .flatMap((env) => env.ref.get().commit());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });
  });

  // TODO: implement after TQueue
  it.skip("STM collectAll ordering", async () => {
    // val tx = for {
    //   tq  <- TQueue.bounded[Int](3)
    //   _   <- tq.offer(1)
    //   _   <- tq.offer(2)
    //   _   <- tq.offer(3)
    //   ans <- ZSTM.collectAll(List(tq.take, tq.take, tq.take))
    // } yield ans
    // assertM(tx.commit)(equalTo(List(1, 2, 3)))
  });

  describe.concurrent("taps", () => {
    it("tap should apply the transactional function to the effect result while keeping the effect itself", async () => {
      const program = STM.Do()
        .bind("refA", () => TRef.make(10))
        .bind("refB", () => TRef.make(0))
        .bind("a", ({ refA, refB }) => refA.get().tap((n) => refB.set(n + 1)))
        .bind("b", ({ refB }) => refB.get())
        .commit();

      const { a, b } = await program.unsafeRunPromise();

      assert.strictEqual(a, 10);
      assert.strictEqual(b, 11);
    });

    // TODO: implement after TPromise
    it("tapBoth applies the success function to success values while keeping the effect intact", async () => {
      // val tx =
      //   for {
      //     tapSuccess    <- TPromise.make[Nothing, Int]
      //     tapError      <- TPromise.make[Nothing, String]
      //     succeededSTM   = ZSTM.succeed(42): STM[String, Int]
      //     result        <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a))
      //     tappedSuccess <- tapSuccess.await
      //   } yield (result, tappedSuccess)
      // assertM(tx.commit)(equalTo((42, 42)))
    });

    // TODO: implement after TPromise
    it("tapBoth applies the function to error and successful values while keeping the effect itself on error", async () => {
      // val tx =
      //   for {
      //     tapSuccess  <- TPromise.make[Nothing, Int]
      //     tapError    <- TPromise.make[Nothing, String]
      //     succeededSTM = ZSTM.fail("error"): STM[String, Int]
      //     result      <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a)).either
      //     tappedError <- tapError.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    });

    // TODO: implement after TPromise
    it("tapError should apply the transactional function to the error result while keeping the effect itself", async () => {
      // val tx =
      //   for {
      //     errorRef    <- TPromise.make[Nothing, String]
      //     failedStm    = ZSTM.fail("error") *> ZSTM.succeed(0)
      //     result      <- failedStm.tapError(e => errorRef.succeed(e)).either
      //     tappedError <- errorRef.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    });
  });
});
