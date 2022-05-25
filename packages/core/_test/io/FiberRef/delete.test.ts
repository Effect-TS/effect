const initial = "initial"
const update = "update"

describe.concurrent("FiberRef", () => {
  describe.concurrent("delete", () => {
    it("restores the original value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .tap(({ fiberRef }) => fiberRef.set(update))
        .tap(({ fiberRef }) => fiberRef.delete())
        .flatMap(({ fiberRef }) => fiberRef.get())

      const result = await Effect.scoped(program).unsafeRunPromise()

      assert.strictEqual(result, initial)
    })
  })
})
