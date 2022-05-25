const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

const loseTimeAndCpu: Effect.UIO<void> = (
  Effect.yieldNow < Clock.sleep((1).millis)
).repeatN(100)

describe("FiberRef", () => {
  describe("race", () => {
    it("its value is inherited after simple race", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => fiberRef.set(update1).race(fiberRef.set(update2)))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.isTrue(new RegExp(`${update1}|${update2}`).test(result))
    })

    it("its value is inherited after a race with a bad winner", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue(
          "badWinner",
          ({ fiberRef }) => fiberRef.set(update1) > Effect.fail("ups")
        )
        .bindValue(
          "goodLoser",
          ({ fiberRef }) => fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ badWinner, goodLoser }) => badWinner.race(goodLoser))
        .flatMap(({ fiberRef }) => fiberRef.get())

      const value = await Effect.scoped(program).unsafeRunPromise()

      assert.isTrue(new RegExp(update2).test(value))
    })

    it("its value is not inherited after a race of losers", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser1", ({ fiberRef }) => fiberRef.set(update1).zipRight(Effect.failNow("ups1")))
        .bindValue("loser2", ({ fiberRef }) => fiberRef.set(update2).zipRight(Effect.failNow("ups2")))
        .tap(({ loser1, loser2 }) => loser1.race(loser2).ignore())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, initial)
    })

    it("its value is inherited in a trivial race", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => fiberRef.set(update).raceAll(Chunk.empty<Effect.UIO<void>>()))
        .flatMap((fiberRef) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, update)
    })

    it("the value of the winner is inherited when racing two effects with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("latch", () => Deferred.make<never, void>())
        .bindValue(
          "winner1",
          ({ fiberRef, latch }) => fiberRef.set(update1) > latch.succeed(undefined)
        )
        .bindValue(
          "loser1",
          ({ fiberRef, latch }) => latch.await() > fiberRef.set(update2) > loseTimeAndCpu
        )
        .tap(({ loser1, winner1 }) => loser1.raceAll([winner1]))
        .bind("value1", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))
        .bindValue("winner2", ({ fiberRef }) => fiberRef.set(update1))
        .bindValue(
          "loser2",
          ({ fiberRef }) => fiberRef.set(update2) > Effect.fail(":-O")
        )
        .tap(({ loser2, winner2 }) => loser2.raceAll([winner2]))
        .bind("value2", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, update1)
      assert.strictEqual(value2, update1)
    })

    it("the value of the winner is inherited when racing many effects with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("n", () => 63)
        .bind("latch", () => Deferred.make<never, void>())
        .bindValue(
          "winner1",
          ({ fiberRef, latch }) => fiberRef.set(update1) > latch.succeed(undefined)
        )
        .bindValue(
          "losers1",
          ({ fiberRef, latch, n }) => (latch.await() > fiberRef.set(update2) > loseTimeAndCpu).replicate(n)
        )
        .tap(({ losers1, winner1 }) => winner1.raceAll(losers1))
        .bind("value1", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))
        .bindValue("winner2", ({ fiberRef }) => fiberRef.set(update1))
        .bindValue("losers2", ({ fiberRef, n }) => (fiberRef.set(update1) > Effect.fail(":-O")).replicate(n))
        .tap(({ losers2, winner2 }) => winner2.raceAll(losers2))
        .bind("value2", ({ fiberRef }) => fiberRef.get() < fiberRef.set(initial))

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, update1)
      assert.strictEqual(value2, update1)
    })

    it("nothing gets inherited when racing failures with raceAll", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bindValue("loser", ({ fiberRef }) => fiberRef.set(update).zipRight(Effect.failNow("darn")))
        .tap(({ loser }) => loser.raceAll(Chunk.fill(63, () => loser)) | Effect.unit)
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, initial)
    })
  })
})
