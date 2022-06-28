const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("locally", () => {
    it("restores original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("local", ({ fiberRef }) => fiberRef.get().apply(fiberRef.locally(update)))
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(local, update)
      assert.strictEqual(value, initial)
    })

    it("restores parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("child", ({ fiberRef }) => fiberRef.get().apply(fiberRef.locally(update)).fork)
        .bind("local", ({ child }) => child.join)
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { local, value } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(local, update)
      assert.strictEqual(value, initial)
    })

    it("restores undefined value", async () => {
      const program = Effect.Do()
        .bind("child", () => FiberRef.make(initial).fork)
        // Don't use join as it inherits values from child
        .bind("fiberRef", ({ child }) => child.await.flatMap((_) => Effect.done(_)))
        .bind("localValue", ({ fiberRef }) => fiberRef.get().apply(fiberRef.locally(update)))
        .bind("value", ({ fiberRef }) => fiberRef.get())

      const { localValue, value } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(localValue, update)
      assert.strictEqual(value, initial)
    })
  })
})
