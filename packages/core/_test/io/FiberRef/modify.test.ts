const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("modify", () => {
    it("changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.modify(() => [1, update] as const))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, 1)
        assert.strictEqual(value2, update)
      }).scoped.unsafeRunPromise())
  })

  describe.concurrent("modifySome", () => {
    it("not changes value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        const value1 = $(fiberRef.modifySome(2, () => Maybe.none))
        const value2 = $(fiberRef.get)
        assert.strictEqual(value1, 2)
        assert.strictEqual(value2, initial)
      }).scoped.unsafeRunPromise())
  })
})
