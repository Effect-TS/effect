/**
 * A function that increments ref each time it is called. It always fails,
 * with the incremented value in error.
 */
function alwaysFail(ref: Ref<number>): Effect<never, string, number> {
  return ref.updateAndGet((n) => n + 1).flatMap((n) => Effect.fail(`Error: ${n}`))
}

// function checkDelays<State, Env>(
//   schedule: Schedule.WithState<State, Env, unknown, Duration>
// ): Effect.RIO<Env, Tuple<[Chunk<Duration>, Chunk<Duration>]>> {
//   return Effect.Do()
//     .bind("now", () => Effect.succeed(Date.now()))
//     .bindValue("input", () => Chunk(1, 2, 3, 4, 5))
//     .bind("actual", ({ input, now }) => schedule.run(now, input))
//     .bind("expected", ({ input, now }) => schedule.delays.run(now, input))
//     .map(({ actual, expected }) => Tuple(actual, expected))
// }

// function checkRepetitions<State, Env>(
//   schedule: Schedule.WithState<State, Env, unknown, number>
// ): Effect.RIO<Env, Tuple<[Chunk<number>, Chunk<number>]>> {
//   return Effect.Do()
//     .bind("now", () => Effect.succeed(Date.now()))
//     .bindValue("input", () => Chunk(1, 2, 3, 4, 5))
//     .bind("actual", ({ input, now }) => schedule.run(now, input))
//     .bind("expected", ({ input, now }) => schedule.repetitions.run(now, input))
//     .map(({ actual, expected }) => Tuple(actual, expected))
// }

// function repeat<State, B>(
//   schedule: Schedule.WithState<State, unknown, number, B>
// ): Effect.UIO<B> {
//   return Ref.make(0).flatMap((ref) => ref.updateAndGet((n) => n + 1).repeat(schedule));
// }

// function run<R, E, A>(effect: Effect<R, E, A>): Effect<TestClock & R, E, A> {
//   return effect
//     .fork()
//     .tap(() => Effect.serviceWith(HasTestClock)((testClock) => testClock.adjust(new Duration(Number.MAX_SAFE_INTEGER))))
//     .flatMap((fiber) => fiber.join);
// }

/**
 * Run a `Schedule` using the provided input and collect all outputs.
 */
// export function runCollect<State, Env, In, Out>(
//   schedule: Schedule.WithState<State, Env, In, Out>,
//   input: Iterable<In>
// ): Effect<TestClock & Env, never, Chunk<Out>> {
//   return run(
//     schedule.driver().flatMap((driver) => {
//       function loop(
//         input: List<In>,
//         acc: Chunk<Out>
//       ): Effect<TestClock & Env, never, Chunk<Out>> {
//         if (input.length() === 0) {
//           return Effect.succeed(acc);
//         }
//         const head = input.unsafeHead!;
//         const tail = input.length() === 1 ? List.nil() : input.unsafeTail!;
//         return driver.next(head).foldEffect(
//           () =>
//             driver.last.fold(
//               () => acc,
//               (b) => acc.append(b)
//             ),
//           (b) => loop(tail, acc.append(b))
//         );
//       }
//       return loop(List.from(input), Chunk.empty());
//     })
//   );
// }

describe.concurrent("Schedule", () => {
  describe.concurrent("repeat on success according to a provided strategy", () => {
    it.skip("for 'recurs(a negative number)' repeats 0 additional time", async () => {
      // A repeat with a negative number of times should not repeat the action at all
      // const program = repeat(Schedule.recurs(-5));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 0);
    })

    it.skip("for 'recurs(0)' does repeat 0 additional time", async () => {
      // A repeat with 0 number of times should not repeat the action at all
      // const program = repeat(Schedule.recurs(0));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 0);
    })

    it.skip("for 'recurs(1)' does repeat 1 additional time", async () => {
      // const program = repeat(Schedule.recurs(1));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 1);
    })

    it("for 'once' will repeat 1 additional time", async () => {
      const program = Ref.make(0)
        .tap((ref) => ref.update((n) => n + 1).repeat(Schedule.once))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 2)
    })

    it.skip("for 'recurs(a positive given number)' repeats that additional number of time", async () => {
      // const program = repeat(Schedule.recurs(42));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 42);
    })

    it.skip("for 'recurWhile(cond)' repeats while the cond still holds", async () => {
      // const program = repeat(Schedule.recurWhile((n) => n < 10));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 10);
    })

    it.skip("for 'recurWhileEffect(cond)' repeats while the effectful cond still holds", async () => {
      // const program = repeat(Schedule.recurWhileEffect((n) => Effect.succeed(n > 10)));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 1);
    })

    it.skip("for 'recurWhileEquals(cond)' repeats while the cond is equal", async () => {
      // const program = repeat(Schedule.recurWhileEquals(Equivalence.number)(1));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 2);
    })

    it.skip("for 'recurUntil(cond)' repeats until the cond is satisfied", async () => {
      // const program = repeat(Schedule.recurUntil((n) => n < 10));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 1);
    })

    it.skip("for 'recurUntilEffect(cond)' repeats until the effectful cond is satisfied", async () => {
      // const program = repeat(Schedule.recurUntilEffect((n) => Effect.succeed(n > 10)));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 11);
    })

    it.skip("for 'recurUntilEquals(cond)' repeats until the cond is equal", async () => {
      // const program = repeat(Schedule.recurUntilEquals(Equivalence.number)(1));

      // const result = await program.unsafeRunPromise();

      // assert.strictEqual(result, 1);
    })
  })

  describe.concurrent("collect all inputs into a list", () => {
    it.skip("as long as the condition f holds", async () => {
      // const program = repeat(Schedule.collectWhile((n) => n < 10));

      // const result = await program.unsafeRunPromise();

      // assert.isTrue(result == Chunk(1, 2, 3, 4, 5, 6, 7, 8, 9));
    })

    it.skip("as long as the effectful condition f holds", async () => {
      // const program = repeat(Schedule.collectWhileEffect((n) => Effect.succeed(n > 10)));

      // const result = await program.unsafeRunPromise();

      // assert.isTrue(result.isEmpty);
    })

    it.skip("until the effectful condition f fails", async () => {
      // const program = repeat(Schedule.collectUntil((n) => n < 10 && n > 1));

      // const result = await program.unsafeRunPromise();

      // assert.isTrue(result == Chunk.single(1));
    })

    it.skip("until the effectful condition f fails", async () => {
      // const program = repeat(Schedule.collectUntilEffect((n) => Effect.succeed(n > 10)));

      // const result = await program.unsafeRunPromise();

      // assert.isTrue(result == Chunk(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
    })
  })

  describe.concurrent("repeat an action a single time", () => {
    it("Repeat on failure does not actually repeat", async () => {
      const program = Ref.make(0)
        .flatMap(alwaysFail)
        .foldEffect(
          (e) => Effect.succeed(e),
          () => Effect.succeed("it should never be a success")
        )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "Error: 1")
    })

    it("repeat a scheduled repeat repeats the whole number", async () => {
      const n = 42
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue("io", ({ ref }) => ref.update((n) => n + 1).repeat(Schedule.recurs(n)))
        .tap(({ io }) => io.repeat(Schedule.recurs(1)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, (n + 1) * 2)
    })
  })

  describe.concurrent("repeat an action two times and call ensuring should", () => {
    it("run the specified finalizer as soon as the schedule is complete", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("ref", () => Ref.make(0))
        .tap(({ deferred, ref }) =>
          ref
            .update((n) => n + 2)
            .repeat(Schedule.recurs(2))
            .ensuring(deferred.succeed(undefined))
        )
        .bind("value", ({ ref }) => ref.get())
        .bind("finalizerValue", ({ deferred }) => deferred.poll())

      const { finalizerValue, value } = await program.unsafeRunPromise()

      assert.strictEqual(value, 6)
      assert.isTrue(finalizerValue.isSome())
    })
  })

  // describe.concurrent("simulate a schedule", () => {
  //   it("without timing out", async () => {
  //     const program = Clock.currentTime
  //       .flatMap((now) =>
  //         Schedule.exponential(Duration.fromMinutes(1)).run(
  //           now,
  //           List.repeat(undefined, 5)
  //         )
  //       )
  //       .map((chunk) => chunk.toArray())

  //     const result = await program.unsafeRunPromise()

  //     expect(result).toEqual([
  //       Duration.fromMinutes(1),
  //       Duration.fromMinutes(2),
  //       Duration.fromMinutes(4),
  //       Duration.fromMinutes(8),
  //       Duration.fromMinutes(16)
  //     ])
  //   })
  // })
})
