const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("get", () => {
    it("returns the current value", async () => {
      const program = FiberRef.make(initial).flatMap((fiberRef) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, initial)
    })

    it("returns the correct value for a child", async () => {
      const program = FiberRef.make(initial)
        .flatMap((fiberRef) => fiberRef.get().fork())
        .flatMap((fiber) => fiber.join())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, initial)
    })
  })

  describe.concurrent("getAndUpdate", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdate(() => update))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, update)
    })
  })

  describe.concurrent("getAndUpdateSome", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdateSome(() => Option.some(update)))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, update)
    })

    it("doest not change value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.getAndUpdateSome(() => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get())

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(value1, initial)
      assert.strictEqual(value2, initial)
    })
  })
})
