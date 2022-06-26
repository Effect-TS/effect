const current = "value"
const update = "new value"

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("set", () => {
    it("simple", async () => {
      const program = Ref.Synchronized.make(current)
        .tap((ref) => ref.set(update))
        .flatMap((ref) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, update)
    })
  })
})
