const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("get", () => {
    it("returns the current value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())

    it("returns the correct value for a child", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const fiber = $(fiberRef.get.fork)
        const result = $(fiber.join)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("getAndUpdate", () => {
    it("changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.getAndUpdate(() => update))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, initial)
        assert.strictEqual(value2, update)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("getAndUpdateSome", () => {
    it("changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.getAndUpdateSome(() => Maybe.some(update)))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, initial)
        assert.strictEqual(value2, update)
      }).scoped.unsafeRunPromise())

    it("doest not change value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.getAndUpdateSome(() => Maybe.none))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, initial)
        assert.strictEqual(value2, initial)
      }).scoped.unsafeRunPromise())
  })
})
