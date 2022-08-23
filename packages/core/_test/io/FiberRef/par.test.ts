import { constant } from "@tsplus/stdlib/data/Function"

const initial = "initial"
const update = "update"
const update1 = "update1"
const update2 = "update2"

describe.concurrent("FiberRef", () => {
  describe.concurrent("zipPar", () => {
    it("the value of the loser is inherited in zipPar", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const latch = $(Deferred.make<never, void>())
        const winner = fiberRef.set(update1) > latch.succeed(undefined)
        const loser = latch.await > Clock.sleep((1).millis) > fiberRef.set(update2)
        $(winner.zipPar(loser))
        const result = $(fiberRef.get)
        assert.strictEqual(result, update2)
      }).scoped.unsafeRunPromise())

    it("nothing gets inherited with a failure in zipPar", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const success = fiberRef.set(update)
        const failure1 = fiberRef.set(update).zipRight(Effect.fail(":-("))
        const failure2 = fiberRef.set(update).zipRight(Effect.fail(":-O"))
        $(success.zipPar(failure1.zipPar(failure2)).orElse(Effect.unit))
        const result = $(fiberRef.get)
        assert.isTrue(result.includes(initial))
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("collectAllPar", () => {
    it("the value of all fibers in inherited when running many effects with collectAllPar", () =>
      Do(($) => {
        const n = 10_000
        const fiberRef = $(FiberRef.make(0, constant(0), (a, b) => a + b))
        $(Effect.collectAllPar(Chunk.fill(n, () => fiberRef.update((n) => n + 1))))
        const result = $(fiberRef.get)
        assert.strictEqual(result, n)
      }).scoped.unsafeRunPromise())
  })
})
