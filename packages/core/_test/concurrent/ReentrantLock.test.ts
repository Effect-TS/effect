describe.concurrent("ReentrantLock", () => {
  it("1 lock", () =>
    Effect.scoped(
      Do(($) => {
        const lock = $(ReentrantLock.make())
        const count = $(lock.withLock.flatMap(Effect.succeedNow))
        assert.strictEqual(count, 1)
      })
    ).unsafeRunPromise())

  it("2 locks", () =>
    Effect.scoped(
      Do(($) => {
        const lock = $(ReentrantLock.make())
        const count = $(lock.withLock.zipRight(lock.withLock.flatMap(Effect.succeedNow)))
        assert.strictEqual(count, 2)
      })
    ).unsafeRunPromise())

  it("2 locks from different fibers", () =>
    Do(($) => {
      const lock = $(ReentrantLock.make())
      const mlatch = $(Deferred.make<never, void>())
      const wlatch = $(Deferred.make<never, void>())
      $(Effect.scoped(lock.withLock.flatMap((count) => mlatch.succeed(undefined).as(count))).fork)
      $(mlatch.await())
      const reader = $(Effect.scoped(lock.withLock.flatMap(count => wlatch.succeed(undefined).as(count))).fork)
      $(wlatch.await())
      const count = $(reader.join)
      assert.strictEqual(count, 1)
    }).unsafeRunPromise())

  it("cleans up interrupted waiters", () =>
    Do(($) => {
      const lock = $(ReentrantLock.make())
      const mlatch = $(Deferred.make<never, void>())
      const latch1 = $(CountdownLatch.make(2))
      const wlatch = $(Deferred.make<never, void>())
      const wlatch2 = $(Deferred.make<never, void>())
      const ref = $(Ref.make(0))
      $(
        Effect.scoped(
          lock.withLock.zipRight(mlatch.succeed(undefined)).zipRight(wlatch.await())
        ).fork
      )
      $(mlatch.await())
      const fiber1 = $(
        latch1.countDown.zipRight(
          Effect.scoped(lock.withLock.zipRight(ref.update((n) => n + 10)))
        ).fork
      )
      $(
        latch1.countDown.zipRight(
          Effect.scoped(
            lock.withLock.zipRight(ref.update((n) => n + 10).zipLeft(wlatch2.succeed(undefined)))
          )
        ).fork
      )
      $(latch1.await)
      const waiters1 = $(lock.queueLength)
      $(fiber1.interrupt)
      $(wlatch.succeed(undefined).zipRight(wlatch2.await()))
      const waiters2 = $(lock.queueLength)
      const count = $(ref.get())
      assert.strictEqual(waiters1, 2)
      assert.strictEqual(waiters2, 0)
      assert.strictEqual(count, 10)
    }).unsafeRunPromise())

  it("assigns lock to fibers randomly", async () => {
    const f1 = (x: number) => x * 2
    const f2 = (x: number) => x - 10
    const f3 = (x: number) => Math.floor(x / 4)
    const f4 = (x: number) => x + 100
    const f = (x: number) => f4(f3(f2(f1(x))))

    const program = Effect.Do()
      .bind("lock", () => ReentrantLock.make())
      .bind("ref", () => Ref.make(1))
      .bind("deferred", () => Deferred.make<never, void>())
      .bind("latch", () => CountdownLatch.make(4))
      .tap(({ deferred, lock }) => Effect.scoped(lock.withLock.zipRight(deferred.await())).fork)
      .bind("fiber1", ({ latch, lock, ref }) =>
        latch.countDown.zipRight(Effect.scoped(
          lock.withLock.zipRight(ref.update(f1))
        )).fork)
      .bind("fiber2", ({ latch, lock, ref }) =>
        latch.countDown.zipRight(Effect.scoped(
          lock.withLock.zipRight(ref.update(f2))
        )).fork)
      .bind("fiber3", ({ latch, lock, ref }) =>
        latch.countDown.zipRight(Effect.scoped(
          lock.withLock.zipRight(ref.update(f3))
        )).fork)
      .bind("fiber4", ({ latch, lock, ref }) =>
        latch.countDown.zipRight(Effect.scoped(
          lock.withLock.zipRight(ref.update(f4))
        )).fork)
      .bindValue("fibers", ({ fiber1, fiber2, fiber3, fiber4 }) => List(fiber1, fiber2, fiber3, fiber4))
      .tap(({ latch }) => latch.await)
      .tap(({ deferred }) => deferred.succeed(undefined))
      .tap(({ fibers }) => Effect.forEachDiscard(fibers, (fiber) => fiber.join))
      .bind("result", ({ ref }) => ref.get())
      .map(({ result }) => result === f(1))

    const results = await Effect.collectAll(Effect.replicate(100, program)).unsafeRunPromise()

    assert.isBelow(results.filter(identity).size, 100)
  })
  // Do(($) => {
  //   const f1 = (x: number) => x * 2
  //   const f2 = (x: number) => x - 10
  //   const f3 = (x: number) => Math.floor(x / 4)
  //   const f4 = (x: number) => x + 100
  //   const f = (x: number) => f4(f3(f2(f1(x))))
  //   const program = Do(($$) => {
  //     const lock = $$(ReentrantLock.make())
  //     const ref = $$(Ref.make(1))
  //     const deferred = $$(Deferred.make<never, void>())
  //     const latch = $$(CountdownLatch.make(4))
  //     $$(Effect.scoped(lock.withLock.zipRight(deferred.await())).fork)
  //     const fiber1 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f1)))).fork)
  //     const fiber2 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f2)))).fork)
  //     const fiber3 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f3)))).fork)
  //     const fiber4 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f4)))).fork)
  //     const fibers = List(fiber1, fiber2, fiber3, fiber4)
  //     $$(latch.await)
  //     $$(deferred.succeed(undefined))
  //     $$(Effect.forEachDiscard(fibers, (fiber) => fiber.join))
  //     const result = $$(ref.get())
  //     return result === f(1)
  //   })
  //   const results = $(Effect.collectAll(Effect.replicate(100, program)))
  //   console.log(results)
  //   assert.isBelow(results.filter(identity).size, 100)
  // }).unsafeRunPromise())

  it("fairness assigns lock to fibers in order", () =>
    Do(($) => {
      const f1 = (x: number) => x * 2
      const f2 = (x: number) => x - 10
      const f3 = (x: number) => Math.floor(x / 4)
      const f4 = (x: number) => x + 100
      const f = (x: number) => f4(f3(f2(f1(x))))

      const lock = $(ReentrantLock.make(true))
      const ref = $(Ref.make(1))
      const deferred0 = $(Deferred.make<never, void>())
      $(Effect.scoped(lock.withLock.zipRight(deferred0.await())).fork)
      const deferred1 = $(Deferred.make<never, void>())
      const fiber1 = $(
        deferred1.succeed(undefined).zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f1)))).fork
      )
      const deferred2 = $(Deferred.make<never, void>())
      const fiber2 = $(
        deferred1.await().zipRight(deferred2.succeed(undefined)).zipRight(
          Effect.scoped(lock.withLock.zipRight(ref.update(f2)))
        ).fork
      )
      const deferred3 = $(Deferred.make<never, void>())
      const fiber3 = $(
        deferred2.await().zipRight(deferred3.succeed(undefined)).zipRight(
          Effect.scoped(lock.withLock.zipRight(ref.update(f3)))
        ).fork
      )
      const fiber4 = $(deferred3.await().zipRight(Effect.scoped(lock.withLock.zipRight(ref.update(f4)))).fork)
      const fibers = List(fiber1, fiber2, fiber3, fiber4)
      $(deferred0.succeed(undefined))
      $(Effect.forEachDiscard(fibers, (fiber) => fiber.join))
      const result = $(ref.get())
      assert.strictEqual(result, f(1))
    }).unsafeRunPromise())
})
