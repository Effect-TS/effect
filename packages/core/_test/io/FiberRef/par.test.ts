const initial = "initial";
const update = "update";
const update1 = "update1";
const update2 = "update2";

const loseTimeAndCpu: Effect<HasClock, never, void> = (
  Effect.yieldNow < Clock.sleep((1).millis)
).repeatN(100);

describe.concurrent("FiberRef", () => {
  describe.concurrent("zipPar", () => {
    it("the value of the loser is inherited in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch", () => Deferred.make<never, void>())
        .bindValue(
          "winner",
          ({ fiberRef, latch }) => fiberRef.set(update1) > latch.succeed(undefined).asUnit()
        )
        .bindValue(
          "loser",
          ({ fiberRef, latch }) => latch.await() > fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ loser, winner }) => winner.zipPar(loser))
        .flatMap(({ fiberRef }) => fiberRef.get());

      const value = await program.unsafeRunPromise();

      assert.strictEqual(value, update2);
    });

    it("nothing gets inherited with a failure in zipPar", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("success", ({ fiberRef }) => fiberRef.set(update))
        .bindValue("failure1", ({ fiberRef }) => fiberRef.set(update).zipRight(Effect.failNow(":-(")))
        .bindValue("failure2", ({ fiberRef }) => fiberRef.set(update).zipRight(Effect.failNow(":-O")))
        .tap(({ failure1, failure2, success }) => success.zipPar(failure1.zipPar(failure2)).orElse(Effect.unit))
        .flatMap(({ fiberRef }) => fiberRef.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.includes(initial));
    });
  });

  describe.concurrent("collectAllPar", () => {
    it("the value of all fibers in inherited when running many effects with collectAllPar", async () => {
      const program = FiberRef.make(
        0,
        () => 0,
        (x, y) => x + y
      )
        .tap((fiberRef) => Effect.collectAllPar(Chunk.fill(100000, () => fiberRef.update((n) => n + 1))))
        .flatMap((fiberRef) => fiberRef.get());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 100000);
    });
  });
});
