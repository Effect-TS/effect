const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

const loseTimeAndCpu: Effect.UIO<void> = (
  Effect.yieldNow < Clock.sleep((1).millis)
).repeatN(100)

describe.concurrent("FiberRef", () => {
  describe.concurrent("race", () => {
    it("its value is inherited after simple race", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        $(fiberRef.set(update1).race(fiberRef.set(update2)))
        const result = $(fiberRef.get)
        assert.isTrue(new RegExp(`${update1}|${update2}`).test(result))
      }).scoped.unsafeRunPromise())

    it("its value is inherited after a race with a bad winner", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const badWinner = fiberRef.set(update1).zipRight(Effect.fail("ups"))
        const goodLoser = fiberRef.set(update2).zipRight(loseTimeAndCpu)
        $(badWinner.race(goodLoser))
        const result = $(fiberRef.get)
        assert.isTrue(new RegExp(update2).test(result))
      }).scoped.unsafeRunPromise())

    it("its value is not inherited after a race of losers", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const loser1 = fiberRef.set(update1).zipRight(Effect.fail("ups1"))
        const loser2 = fiberRef.set(update2).zipRight(Effect.fail("ups2"))
        $(loser1.race(loser2).ignore)
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())

    it("its value is inherited in a trivial race", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        $(fiberRef.set(update).raceAll(Chunk.empty<Effect.UIO<void>>()))
        const result = $(fiberRef.get)
        assert.strictEqual(result, update)
      }).scoped.unsafeRunPromise())

    it("the value of the winner is inherited when racing two effects with raceAll", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const latch = $(Deferred.make<never, void>())
        const winner1 = fiberRef.set(update1).zipRight(latch.succeed(undefined))
        const loser1 = latch.await.zipRight(fiberRef.set(update2)).zipRight(loseTimeAndCpu)
        $(loser1.raceAll([winner1]))
        const value1 = $(fiberRef.get.zipLeft(fiberRef.set(initial)))
        const winner2 = fiberRef.set(update1)
        const loser2 = fiberRef.set(update2).zipRight(Effect.fail(":-O"))
        $(loser2.raceAll([winner2]))
        const value2 = $(fiberRef.get.zipLeft(fiberRef.set(initial)))
        assert.strictEqual(value1, update1)
        assert.strictEqual(value2, update1)
      }).scoped.unsafeRunPromise())

    it("the value of the winner is inherited when racing many effects with raceAll", () =>
      Do(($) => {
        const n = 63
        const fiberRef = $(FiberRef.make(initial))
        const latch = $(Deferred.make<never, void>())
        const winner1 = fiberRef.set(update1).zipRight(latch.succeed(undefined))
        const losers1 = latch.await
          .zipRight(fiberRef.set(update2))
          .zipRight(loseTimeAndCpu).replicate(n)
        $(winner1.raceAll(losers1))
        const value1 = $(fiberRef.get.zipLeft(fiberRef.set(initial)))
        const winner2 = fiberRef.set(update1)
        const losers2 = fiberRef.set(update1).zipRight(Effect.fail(":-O")).replicate(n)
        $(winner2.raceAll(losers2))
        const value2 = $(fiberRef.get.zipLeft(fiberRef.set(initial)))
        assert.strictEqual(value1, update1)
        assert.strictEqual(value2, update1)
      }).scoped.unsafeRunPromise())

    it("nothing gets inherited when racing failures with raceAll", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const loser = fiberRef.set(update).zipRight(Effect.fail("darn"))
        $(loser.raceAll(Chunk.fill(63, () => loser)).orElse(Effect.unit))
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())
  })
})
