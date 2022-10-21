const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("locally", () => {
    it("restores original value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const local = $(fiberRef.get.apply(fiberRef.locally(update)))
        const value = $(fiberRef.get)
        assert.strictEqual(local, update)
        assert.strictEqual(value, initial)
      }).scoped.unsafeRunPromise())

    it("restores parent's value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const child = $(fiberRef.get.apply(fiberRef.locally(update)).fork)
        const local = $(child.join)
        const value = $(fiberRef.get)
        assert.strictEqual(local, update)
        assert.strictEqual(value, initial)
      }).scoped.unsafeRunPromise())

    it("restores undefined value", () =>
      Do(($) => {
        const child = $(FiberRef.make(initial).fork)
        // Don't use join as it inherits values from child
        const fiberRef = $(child.await.flatMap((exit) => Effect.done(exit)))
        const localValue = $(fiberRef.get.apply(fiberRef.locally(update)))
        const value = $(fiberRef.get)
        assert.strictEqual(localValue, update)
        assert.strictEqual(value, initial)
      }).scoped.unsafeRunPromise())
  })
})
