import { ExampleError } from "@effect-ts/core/test/stm/STM/test-utils";

describe.concurrent("STM", () => {
  describe.concurrent("Using `STM.atomically` to perform different computations and call:", () => {
    describe.concurrent("absolve to convert", () => {
      it("a successful Right computation into the success channel", async () => {
        const program = STM.succeed(Either.right(42)).absolve().commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 42);
      });

      it("a successful Left computation into the error channel", async () => {
        const program = STM.succeed(Either.left("oh no!")).absolve().commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("oh no!"));
      });
    });

    it("catchAll errors", async () => {
      const program = (STM.fail("uh oh!") > STM.succeed("everything is fine"))
        .catchAll((s) => STM.succeed(`${s} phew`))
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "uh oh! phew");
    });

    describe.concurrent("catchSome errors", () => {
      it("catch the specified error", async () => {
        type ErrorTest = "Error1";

        const program = (
          STM.fail<ErrorTest>("Error1") > STM.succeed("everything is fine")
        )
          .catchSome((e) => e === "Error1" ? Option.some(STM.succeed("gotcha")) : Option.none)
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, "gotcha");
      });

      it("lets the error pass", async () => {
        type ErrorTest = "Error1" | "Error2";

        const program = (
          STM.fail<ErrorTest>("Error2") > STM.succeed("everything is fine")
        )
          .catchSome((e) => e === "Error1" ? Option.some(STM.succeed("gotcha")) : Option.none)
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("Error2"));
      });
    });

    // TODO: implement after TQueue
    it.skip("repeatWhile to run effect while it satisfies predicate", async () => {
      // (for {
      //   a <- TQueue.bounded[Int](5)
      //   _ <- a.offerAll(List(0, 0, 0, 1, 2))
      //   n <- a.take.repeatWhile(_ == 0)
      // } yield assert(n)(equalTo(1))).commit
    });

    // TODO: implement after TQueue
    it.skip("repeatUntil to run effect until it satisfies predicate", async () => {
      // (for {
      //   a <- TQueue.bounded[Int](5)
      //   _ <- a.offerAll(List(0, 0, 0, 1, 2))
      //   b <- a.take.repeatUntil(_ == 1)
      // } yield assert(b)(equalTo(1))).commit
    });

    describe.concurrent("either to convert", () => {
      it("a successful computation into Right(a)", async () => {
        const program = STM.succeed(42).either().commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Either.right(42));
      });

      it("a failed computation into Left(e)", async () => {
        const program = STM.fail("oh no!").either().commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Either.left("oh no!"));
      });
    });

    it("eventually succeeds", async () => {
      function stm(ref: TRef<number>): STM<unknown, string, number> {
        return ref
          .get()
          .flatMap((n) => n < 10 ? ref.update((n) => n + 1) > STM.fail("ouch") : STM.succeed(n));
      }

      const program = TRef.make(0)
        .flatMap((ref) => stm(ref).eventually())
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 10);
    });

    it("failed to make a failed computation and check the value", async () => {
      const program = STM.fail("bye bye world").commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("bye bye world"));
    });

    it("filter filters a collection using an effectual predicate", async () => {
      const program = STM.Do()
        .bind("ref", () => TRef.make(Chunk.empty<number>()))
        .bind(
          "results",
          ({ ref }) => STM.filter([2, 4, 6, 3, 5, 6], (n) => ref.update((chunk) => chunk.append(n)).as(n % 2 === 0))
        )
        .bind("effects", ({ ref }) => ref.get())
        .commit();

      const { effects, results } = await program.unsafeRunPromise();

      assert.isTrue(results == Chunk(2, 4, 6, 6));
      assert.isTrue(effects == Chunk(2, 4, 6, 3, 5, 6));
    });

    it("filterOrDie dies when predicate fails", async () => {
      const program = STM.succeed(1)
        .filterOrDie((n) => n !== 1, ExampleError)
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(ExampleError));
    });

    it("filterOrDieMessage dies with message when predicate fails ", async () => {
      const program = STM.succeed(1)
        .filterOrDieMessage((n) => n !== 1, "dies")
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(new RuntimeError("dies")));
    });

    describe.concurrent("filterOrElse", () => {
      it("returns checked failure", async () => {
        const program = STM.succeed(1)
          .filterOrElse((n) => n === 1, STM.succeed(2))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("returns held value", async () => {
        const program = STM.succeed(1)
          .filterOrElse((n) => n !== 1, STM.succeed(2))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 2);
      });
    });

    describe.concurrent("filterOrElseWith", () => {
      it("returns checked failure", async () => {
        const program = STM.succeed(1)
          .filterOrElseWith(
            (n) => n === 1,
            (n) => STM.succeed(n + 1)
          )
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("returns held value", async () => {
        const program = STM.succeed(1)
          .filterOrElseWith(
            (n) => n !== 1,
            (n) => STM.succeed(n + 1)
          )
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 2);
      });

      it("returns error", async () => {
        const program = (STM.fail(ExampleError) > STM.succeed(1))
          .filterOrElseWith(
            (n) => n !== 1,
            (n) => STM.succeed(n + 1)
          )
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      });
    });

    it("filterOrFail returns failure when predicate fails", async () => {
      const program = STM.succeed(1)
        .filterOrFail((n) => n !== 1, ExampleError)
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("flatMapError to flatMap from one error to another", async () => {
      const program = STM.fail(-1)
        .flatMapError((n) => STM.succeed(`log: ${n}`))
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("log: -1"));
    });

    it("flatten", async () => {
      const program = STM.Do()
        .bind("result1", () => STM.succeed(STM.succeed("test")).flatten())
        .bind("result2", () => STM.flatten(STM.succeed(STM.succeed("test"))))
        .commit();

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual(result1, "test");
      assert.isTrue(result1 === result2);
    });

    describe.concurrent("flattenErrorOption", () => {
      it("with an existing error and return it", async () => {
        const program = STM.fail(Option.some("oh no!"))
          .flattenErrorOption("default error")
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("oh no!"));
      });

      it("with no error and default to value", async () => {
        const program = STM.fail(Option.none)
          .flattenErrorOption("default error")
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("default error"));
      });
    });

    it("fold to handle both failure and success", async () => {
      const program = STM.Do()
        .bind("result1", () =>
          STM.succeed("yes").fold(
            () => -1,
            () => 1
          ))
        .bind("result2", () =>
          STM.fail("no").fold(
            () => -1,
            () => 1
          ))
        .commit();

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual(result1, 1);
      assert.strictEqual(result2, -1);
    });

    it("foldSTM to fold over the `STM` effect, and handle failure and success", async () => {
      const program = STM.Do()
        .bind("result1", () => STM.succeed("yes").foldSTM(() => STM.succeed("no"), STM.succeedNow))
        .bind("result2", () => STM.fail("no").foldSTM(STM.succeedNow, () => STM.succeed("yes")))
        .commit();

      const { result1, result2 } = await program.unsafeRunPromise();

      assert.strictEqual(result1, "yes");
      assert.strictEqual(result2, "no");
    });

    describe.concurrent("foldLeft", () => {
      it("with a successful step function sums the list properly", async () => {
        const program = STM.reduce(List(1, 2, 3, 4, 5), 0, (acc, n) => STM.succeed(acc + n)).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 15);
      });

      it("with a failing step function returns a failed transaction", async () => {
        const program = STM.reduce(List(1), 0, () => STM.fail("fail")).commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("fail"));
      });

      it("run sequentially from left to right", async () => {
        const program = STM.reduce(
          List(1, 2, 3, 4, 5),
          List.empty<number>(),
          (acc: List<number>, n) => STM.succeed(acc.prepend(n))
        )
          .map((list: List<number>) => list.reverse())
          .commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == List(1, 2, 3, 4, 5));
      });
    });

    describe.concurrent("foldRight", () => {
      it("with a successful step function sums the list properly", async () => {
        const program = STM.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, n) => STM.succeed(acc + n)).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 15);
      });

      it("with a failing step function returns a failed transaction", async () => {
        const program = STM.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, n) => STM.fail("fail")).commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("fail"));
      });

      it("run sequentially from right to left", async () => {
        const program = STM.reduceRight(
          List(1, 2, 3, 4, 5),
          List.empty<number>(),
          (n, acc: List<number>) => STM.succeed(acc.prepend(n))
        )
          .map((list: List<number>) => list.reverse())
          .commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == List(5, 4, 3, 2, 1));
      });
    });

    describe.concurrent("head", () => {
      it("extracts the value from the List", async () => {
        const program = STM.succeed(List(1, 2)).head.commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("returns None if list is Empty", async () => {
        const program = STM.succeed(List.empty<number>()).head.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.none));
      });

      it("returns the Error around Some", async () => {
        const program = STM.fromEither(
          Either.leftW<string, List<number>>("my error")
        ).head.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.some("my error")));
      });
    });

    describe.concurrent("ifSTM", () => {
      it("runs `onTrue` if result of `b` is `true`", async () => {
        const program = STM.ifSTM(
          STM.succeed(true),
          STM.succeed(true),
          STM.succeed(false)
        ).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result);
      });

      it("runs `onFalse` if result of `b` is `false`", async () => {
        const program = STM.ifSTM(
          STM.succeed(false),
          STM.succeed(true),
          STM.succeed(false)
        ).commit();

        const result = await program.unsafeRunPromise();

        assert.isFalse(result);
      });
    });

    describe.concurrent("left", () => {
      it("on Left value", async () => {
        const program = STM.succeed(Either.left("left")).left.commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, "left");
      });

      it("on Right value", async () => {
        const program = STM.succeed(Either.right("right")).left.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Either.right("right")));
      });

      it("on failure", async () => {
        const program = STM.fail("fail").left.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Either.left("fail")));
      });

      it("lifting a value", async () => {
        const program = STM.left(42).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Either.left(42));
      });
    });

    describe.concurrent("mapBoth when", () => {
      it("having a success value", async () => {
        const program = STM.succeed(1)
          .mapBoth(
            () => -1,
            (n) => `${n} as string`
          )
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, "1 as string");
      });

      it("having a fail value", async () => {
        const program = STM.fail(-1)
          .mapBoth(
            (n) => `${n} as string`,
            () => 0
          )
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("-1 as string"));
      });
    });

    it("mapError to map from one error to another", async () => {
      const program = STM.fail(-1)
        .mapError(() => "oh no!")
        .commit();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("oh no!"));
    });

    describe.concurrent("merge", () => {
      it("on error with same type", async () => {
        const program = STM.fromEither<number, number>(Either.left(1)).merge().commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("when having a successful value", async () => {
        const program = STM.fromEither<number, number>(Either.right(1)).merge().commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });
    });

    describe.concurrent("none", () => {
      it("when A is None", async () => {
        const program = STM.succeed(Option.none).noneOrFail().commit();

        const result = await program.unsafeRunPromise();

        assert.isUndefined(result);
      });

      it("when Error", async () => {
        const program = STM.fail(ExampleError).noneOrFail().commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.some(ExampleError)));
      });

      it("when A is Some(a)", async () => {
        const program = STM.succeed(Option.some(1)).noneOrFail().commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.none));
      });

      it("lifting a value", async () => {
        const program = STM.none.commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.none);
      });
    });

    describe.concurrent("option to convert:", () => {
      it("a successful computation into Some(a)", async () => {
        const program = STM.succeed(42).option().commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.some(42));
      });

      it("a failed computation into None", async () => {
        const program = STM.fail("oh no!").option().commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.none);
      });
    });

    describe.concurrent("optional to convert:", () => {
      it("a Some(e) in E to a e in E", async () => {
        const program = STM.fromEither<Option<string>, number>(
          Either.left(Option.some("my error"))
        )
          .unsome()
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("my error"));
      });

      it("a None in E into None in A", async () => {
        const program = STM.fromEither<Option<string>, number>(Either.left(Option.none))
          .unsome()
          .commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.none);
      });

      it("no error", async () => {
        const program = STM.fromEither<Option<string>, number>(Either.right(42))
          .unsome()
          .commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.some(42));
      });
    });

    describe.concurrent("orDie", () => {
      it("when failure should die", async () => {
        const program = STM.fail(() => {
          throw ExampleError;
        })
          .orDie()
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.die(ExampleError));
      });

      it("when succeed should keep going", async () => {
        const program = STM.succeed(1).orDie().commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });
    });

    describe.concurrent("orDieWith", () => {
      it("when failure should die", async () => {
        const program = STM.fail("-1")
          .orDieWith((s) => new Error(s))
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.die(new Error("-1")));
      });

      it("when succeed should keep going", async () => {
        const program = STM.fromEither<string, number>(Either.right(1))
          .orDieWith((s) => new Error(s))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });
    });

    describe.concurrent("partition", () => {
      it("collects only successes", async () => {
        const input = Chunk.range(0, 9);
        const program = STM.partition(input, STM.succeedNow).commit();

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise();

        assert.isTrue(left.isEmpty());
        assert.isTrue(right == input);
      });

      it("collects only failures", async () => {
        const input = List.from(Array.from({ length: 10 }, () => 0));
        const program = STM.partition(input, STM.failNow).commit();

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise();

        assert.isTrue(left == input);
        assert.isTrue(right.isEmpty());
      });

      it("collects failures and successes", async () => {
        const input = Chunk.range(0, 9);
        const program = STM.partition(input, (n) => n % 2 === 0 ? STM.fail(n) : STM.succeed(n)).commit();

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise();

        assert.isTrue(left == Chunk(0, 2, 4, 6, 8));
        assert.isTrue(right == Chunk(1, 3, 5, 7, 9));
      });

      it("evaluates effects in correct order", async () => {
        const input = List(2, 4, 6, 3, 5, 6);
        const program = STM.Do()
          .bind("ref", () => TRef.make<List<number>>(List.empty()))
          .tap(({ ref }) => STM.partition(input, (n) => ref.update((list) => list.prepend(n))))
          .flatMap(({ ref }) => ref.get().map((list) => list.reverse()))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == List(2, 4, 6, 3, 5, 6));
      });
    });

    describe.concurrent("reject", () => {
      it("returns failure ignoring value", async () => {
        const program = STM.succeed(0)
          .reject((n) => (n !== 0 ? Option.some("partial failed") : Option.none))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 0);
      });

      it("returns failure ignoring value", async () => {
        const program = STM.succeed(1)
          .reject((n) => (n !== 0 ? Option.some("partial failed") : Option.none))
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("partial failed"));
      });
    });

    describe.concurrent("rejectSTM", () => {
      it("doesnt collect value", async () => {
        const program = STM.succeed(0)
          .rejectSTM((n) => n !== 0 ? Option.some(STM.succeed("partial failed")) : Option.none)
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 0);
      });

      it("returns failure ignoring value", async () => {
        const program = STM.succeed(1)
          .rejectSTM((n) => n !== 0 ? Option.some(STM.succeed("partial failed")) : Option.none)
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail("partial failed"));
      });
    });

    describe.concurrent("replicate", () => {
      it("zero", async () => {
        const program = STM.collectAll(STM.replicate(0, STM.succeed(12))).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result.isEmpty());
      });

      it("negative", async () => {
        const program = STM.collectAll(STM.replicate(-2, STM.succeed(12))).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result.isEmpty());
      });

      it("positive", async () => {
        const program = STM.collectAll(STM.replicate(2, STM.succeed(12))).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Chunk(12, 12));
      });
    });

    describe.concurrent("right", () => {
      it("on Right value", async () => {
        const program = STM.succeed(Either.right("right")).right.commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, "right");
      });

      it("on Left value", async () => {
        const program = STM.succeed(Either.left("left")).right.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Either.left("left")));
      });

      it("on failure", async () => {
        const program = STM.fail("fail").right.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Either.right("fail")));
      });

      it("lifting a value", async () => {
        const program = STM.right(42).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Either.right(42));
      });
    });

    describe.concurrent("some", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).some.commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("fails on None", async () => {
        const program = STM.succeed(Option.none).some.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.none));
      });

      it("fails when given an exception", async () => {
        const program = STM.fail(ExampleError).some.commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(Option.some(ExampleError)));
      });

      it("lifting a value", async () => {
        const program = STM.some(42).commit();

        const result = await program.unsafeRunPromise();

        assert.isTrue(result == Option.some(42));
      });
    });

    describe.concurrent("someOrElse", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).someOrElse(42).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("falls back to the default value if None", async () => {
        const program = STM.succeed(Option.none).someOrElse(42).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 42);
      });

      it("does not change failed state", async () => {
        const program = STM.fail(ExampleError).someOrElse(42).commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      });
    });

    describe.concurrent("someOrElseSTM", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1))
          .someOrElseSTM(STM.succeed(42))
          .commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("falls back to the default value if None", async () => {
        const program = STM.succeed(Option.none).someOrElseSTM(STM.succeed(42)).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 42);
      });

      it("does not change failed state", async () => {
        const program = STM.fail(ExampleError).someOrElseSTM(STM.succeed(42)).commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      });
    });

    describe.concurrent("someOrFail", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).someOrFail(ExampleError).commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 1);
      });

      it("fails on None", async () => {
        const program = STM.succeed(Option.none).someOrFail(ExampleError).commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      });

      it("fails with the original error", async () => {
        const program = STM.fail(ExampleError)
          .someOrFail(new Error("not example"))
          .commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      });
    });

    describe.concurrent("someOrFailException", () => {
      it("extracts the optional value", async () => {
        const program = STM.succeed(Option.some(42)).someOrFailException().commit();

        const result = await program.unsafeRunPromise();

        assert.strictEqual(result, 42);
      });

      it("fails when given a None", async () => {
        const program = STM.succeed(Option.none).someOrFailException().commit();

        const result = await program.unsafeRunPromiseExit();

        assert.isTrue(result.untraced() == Exit.fail(new NoSuchElement()));
      });
    });

    it("succeed to make a successful computation and check the value", async () => {
      const program = STM.succeed("hello world").commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, "hello world");
    });

    describe.concurrent("summarized", () => {
      it("returns summary and value", async () => {
        const program = STM.Do()
          .bind("counter", () => TRef.make(0))
          .bindValue("increment", ({ counter }) => counter.updateAndGet((n) => n + 1))
          .flatMap(({ increment }) => increment.summarized(increment, (start, end) => Tuple(start, end)))
          .commit();

        const {
          tuple: [
            {
              tuple: [start, end]
            },
            value
          ]
        } = await program.unsafeRunPromise();

        assert.strictEqual(start, 1);
        assert.strictEqual(end, 3);
        assert.strictEqual(value, 2);
      });
    });

    it("zip to return a tuple of two computations", async () => {
      const program = STM.succeed(1).zip(STM.succeed("A")).commit();

      const {
        tuple: [n, s]
      } = await program.unsafeRunPromise();

      assert.strictEqual(n, 1);
      assert.strictEqual(s, "A");
    });

    it("zipWith to perform an action to two computations", async () => {
      const program = STM.succeed(598)
        .zipWith(STM.succeed(2), (a, b) => a + b)
        .commit();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 600);
    });
  });
});
