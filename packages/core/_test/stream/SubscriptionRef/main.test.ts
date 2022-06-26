function subscriber(subscriptionRef: SubscriptionRef<number>) {
  return Random.nextIntBetween(1, 200).flatMap((n) => subscriptionRef.changes.take(n).runCollect())
}

describe.concurrent("SubscriptionRef", () => {
  it("multiple subscribers can receive changes", async () => {
    const program = Do(($) => {
      const subscriptionRef = $(SubscriptionRef.make(0))
      const promise1 = $(Deferred.make<never, void>())
      const promise2 = $(Deferred.make<never, void>())
      const subscriber1 = $(
        subscriptionRef.changes.tap(_ => promise1.succeed(undefined as void)).take(3).runCollect().fork()
      )

      $(promise1.await())

      $(subscriptionRef.update((_) => _ + 1))
      const subscriber2 = $(
        subscriptionRef.changes.tap(_ => promise2.succeed(undefined as void)).take(2).runCollect().fork()
      )
      $(promise2.await())
      $(subscriptionRef.update((_) => _ + 1))
      const values1 = $(subscriber1.join())
      const values2 = $(subscriber2.join())

      return Chunk(0, 1, 2) == values1 && Chunk(1, 2) == values2
    })

    const result = await program.unsafeRunPromise()

    assert.isTrue(result)
  })
  it("subscriptions are interruptible", async () => {
    const program = Do(($) => {
      const subscriptionRef = $(SubscriptionRef.make(0))
      const promise1 = $(Deferred.make<never, void>())
      const promise2 = $(Deferred.make<never, void>())
      const subscriber1 = $(
        subscriptionRef.changes.tap(_ => promise1.succeed(undefined as void)).take(5).runCollect().fork()
      )

      $(promise1.await())

      $(subscriptionRef.update((_) => _ + 1))
      const subscriber2 = $(
        subscriptionRef.changes.tap(_ => promise2.succeed(undefined as void)).take(2).runCollect().fork()
      )
      $(promise2.await())
      $(subscriptionRef.update((_) => _ + 1))
      const values1 = $(subscriber1.interrupt())
      const values2 = $(subscriber2.join())

      return values1.isInterrupted && Chunk(1, 2) == values2
    })

    const result = await program.unsafeRunPromise()

    assert.isTrue(result)
  })
  it("concurrent subscribes and unsubscribes are handled correctly", async () => {
    const program = Do(($) => {
      const subscriptionRef = $(SubscriptionRef.make(0))
      const fiber = $(subscriptionRef.update((_) => _ + 1).forever().fork())
      const values = $(Effect.collectAllPar(Chunk.fill(1000, () => subscriber(subscriptionRef))))

      $(fiber.interrupt())

      return values.forAll((_) => _ == _.sortBy(Ord.number))
    })

    const result = await program.unsafeRunPromise()

    assert.isTrue(result)
  })
})
