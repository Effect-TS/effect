describe.concurrent("Queue", () => {
  describe.concurrent("takeN", () => {
    it("returns immediately if there is enough elements", async () => {
      const program = Queue.bounded<number>(100)
        .tap((queue) => queue.offerAll(List(1, 2, 3, 4, 5)))
        .flatMap((queue) => queue.takeN(3))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("returns an empty list if a negative number or zero is specified", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3)))
        .bind("resNegative", ({ queue }) => queue.takeN(-3))
        .bind("resZero", ({ queue }) => queue.takeN(0))

      const { resNegative, resZero } = await program.unsafeRunPromise()

      assert.isTrue(resNegative.isEmpty)
      assert.isTrue(resZero.isEmpty)
    })

    it("blocks until the required number of elements is available", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bindValue("updater", ({ queue }) => queue.offer(10).forever())
        .bindValue("getter", ({ queue }) => queue.takeN(5))
        .flatMap(({ getter, updater }) => getter.race(updater))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.size, 5)
    })
  })
})
