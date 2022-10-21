const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("updateAndGet", () => {
    it("changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.updateAndGet(() => update))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, update)
        assert.strictEqual(value2, update)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("updateSomeAndGet", () => {
    it("changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.updateSomeAndGet(() => Maybe.some(update)))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, update)
        assert.strictEqual(value2, update)
      }).scoped.unsafeRunPromise())

    it("does not change value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.updateSomeAndGet(() => Maybe.none))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, initial)
        assert.strictEqual(value2, initial)
      }).scoped.unsafeRunPromise())
  })
})
