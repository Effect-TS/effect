describe.concurrent("TSemaphore", () => {
  describe.concurrent("factories", () => {
    it("make", async () => {
      const program = TSemaphore.make(10)
        .flatMap((semaphore) => semaphore.available())
        .commit()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })
  })
})
