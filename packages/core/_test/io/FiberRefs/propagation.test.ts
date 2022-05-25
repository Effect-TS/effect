describe("FiberRefs", () => {
  it("propagate FiberRef values across fiber boundaries", async () => {
    const program = Effect.scoped(
      Effect.Do()
        .bind("fiberRef", () => FiberRef.make(false))
        .bind("queue", () => Queue.unbounded<FiberRefs>())
        .bind("producer", ({ fiberRef, queue }) =>
          fiberRef
            .set(true)
            .zipRight(Effect.getFiberRefs().flatMap((a) => queue.offer(a)))
            .fork())
        .bind(
          "consumer",
          ({ fiberRef, queue }) =>
            queue.take.flatMap((fiberRefs) => Effect.setFiberRefs(fiberRefs)).zipRight(fiberRef.get()).fork()
        )
        .tap(({ producer }) => producer.join())
        .flatMap(({ consumer }) => consumer.join())
    )

    const result = await program.unsafeRunPromise()

    assert.isTrue(result)
  })
})
