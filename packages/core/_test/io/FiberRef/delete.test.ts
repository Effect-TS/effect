const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("delete", () => {
    it("restores the original value", () =>
      Do(($) => {
        const fiberRef = $(FiberRef.make(initial))
        $(fiberRef.set(update))
        $(fiberRef.delete)
        const result = $(fiberRef.get)
        assert.strictEqual(result, initial)
      }).scoped.unsafeRunPromise())
  })
})
