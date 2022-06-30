describe.concurrent("Queue", () => {
  describe.concurrent("takeBetween", () => {
    it("returns immediately if there is enough elements", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(2, 5))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10, 20, 30))
    })

    it("returns an empty list if boundaries are inverted", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(5, 2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("returns an empty list if boundaries are negative", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offer(10))
        .tap(({ queue }) => queue.offer(20))
        .tap(({ queue }) => queue.offer(30))
        .flatMap(({ queue }) => queue.takeBetween(-5, -2))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("blocks until a required minimum of elements is collected", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bindValue("updater", ({ queue }) => queue.offer(10).forever)
        .bindValue("getter", ({ queue }) => queue.takeBetween(5, 10))
        .flatMap(({ getter, updater }) => getter.race(updater))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.size >= 5)
    })

    it("returns elements in the correct order", async () => {
      const as = Chunk(-10, -7, -4, -1, 5, 10)
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("fiber", ({ queue }) => Effect.forEach(as, (n) => queue.offer(n)).fork)
        .bind("bs", ({ queue }) => queue.takeBetween(as.size, as.size))
        .tap(({ fiber }) => fiber.interrupt)

      const { bs } = await program.unsafeRunPromise()

      assert.isTrue(bs == as)
    })
  })
})
