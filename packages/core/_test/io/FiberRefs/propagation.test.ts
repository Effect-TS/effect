describe.concurrent("FiberRefs", () => {
  it("propagate FiberRef values across fiber boundaries", () =>
    Do(($) => {
      const fiberRef = $(FiberRef.make(false))
      const queue = $(Queue.unbounded<FiberRefs>())
      const producer = $(
        fiberRef
          .set(true)
          .zipRight(Effect.getFiberRefs().flatMap((a) => queue.offer(a)))
          .fork
      )
      const consumer = $(
        queue.take
          .flatMap((fiberRefs) => Effect.setFiberRefs(fiberRefs)).zipRight(fiberRef.get)
          .fork
      )
      $(producer.join)
      const result = $(consumer.join)
      assert.isTrue(result)
    }).scoped.unsafeRunPromise())
})
