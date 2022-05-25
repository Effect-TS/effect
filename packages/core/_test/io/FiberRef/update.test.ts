const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("updateAndGet", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateAndGet(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, update)
      assert.strictEqual(value2, update)
    })
  })

  describe.concurrent("updateSomeAndGet", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateSomeAndGet(() => Option.some(update)))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, update)
      assert.strictEqual(value2, update)
    })

    it("does not change value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.updateSomeAndGet(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, initial)
    })
  })
})
