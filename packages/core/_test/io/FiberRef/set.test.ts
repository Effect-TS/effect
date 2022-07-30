const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("set", () => {
    it("updates the current value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        $(fiberRef.set(update))
        const result = $(fiberRef.get)
        assert.strictEqual(result, update)
      }).scoped.unsafeRunPromise())

    it("by a child doesn't update parent's value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const deferred = $(Deferred.make<never, void>())
        $(fiberRef.set(update).zipRight(deferred.succeed(undefined)).fork)
        $(deferred.await)
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())
  })
})
