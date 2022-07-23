describe.concurrent("ReentrantLock", () => {
  it("1 lock", () =>
    Effect.scoped(
      Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const count = $(lock.withLockScoped.flatMap(Effect.succeedNow))
        assert.strictEqual(count, 1)
      })
    ).unsafeRunPromise())

  it("2 locks", () =>
    Effect.scoped(
      Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const count = $(lock.withLockScoped.zipRight(lock.withLockScoped.flatMap(Effect.succeedNow)))
        assert.strictEqual(count, 2)
      })
    ).unsafeRunPromise())

  it("2 locks from different fibers", () =>
    Do(($) => {
      const lock = $(TReentrantLock.make().commit)
      const mlatch = $(Deferred.make<never, void>())
      const wlatch = $(Deferred.make<never, void>())
      $(Effect.scoped(lock.withLockScoped.flatMap((count) => mlatch.succeed(undefined).as(count))).fork)
      $(mlatch.await())
      const reader = $(Effect.scoped(lock.withLockScoped.flatMap(count => wlatch.succeed(undefined).as(count))).fork)
      $(wlatch.await())
      const count = $(reader.join)
      assert.strictEqual(count, 1)
    }).unsafeRunPromise())

  it("cleans up interrupted waiters", () =>
    Do(($) => {
      const lock = $(TReentrantLock.make().commit)
      const mlatch = $(Deferred.make<never, void>())
      const latch1 = $(CountdownLatch.make(2))
      const wlatch = $(Deferred.make<never, void>())
      const wlatch2 = $(Deferred.make<never, void>())
      const ref = $(Ref.make(0))
      $(
        Effect.scoped(
          lock.withLockScoped.zipRight(mlatch.succeed(undefined)).zipRight(wlatch.await())
        ).fork
      )
      $(mlatch.await())
      const fiber1 = $(
        latch1.countDown.zipRight(
          Effect.scoped(lock.withLockScoped.zipRight(ref.update((n) => n + 10)))
        ).fork
      )
      $(
        latch1.countDown.zipRight(
          Effect.scoped(
            lock.withLockScoped.zipRight(ref.update((n) => n + 10).zipLeft(wlatch2.succeed(undefined)))
          )
        ).fork
      )
      $(latch1.await)
      $(fiber1.interrupt)
      $(wlatch.succeed(undefined).zipRight(wlatch2.await()))
      const count = $(ref.get())
      assert.strictEqual(count, 10)
    }).unsafeRunPromise())

  it("assigns lock to fibers randomly", () =>
    Do(($) => {
      const f1 = (x: number) => x * 2
      const f2 = (x: number) => x - 10
      const f3 = (x: number) => Math.floor(x / 4)
      const f4 = (x: number) => x + 100
      const f = (x: number) => f4(f3(f2(f1(x))))
      const program = Do(($$) => {
        const lock = $$(TReentrantLock.makeCommit())
        const ref = $$(Ref.make(1))
        const deferred = $$(Deferred.make<never, void>())
        const latch = $$(CountdownLatch.make(4))
        $$(Effect.scoped(lock.withLockScoped.zipRight(deferred.await())).fork)
        const fiber1 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f1)))).fork)
        const fiber2 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f2)))).fork)
        const fiber3 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f3)))).fork)
        const fiber4 = $$(latch.countDown.zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f4)))).fork)
        const fibers = List(fiber1, fiber2, fiber3, fiber4)
        $$(latch.await)
        $$(deferred.succeed(undefined))
        $$(Effect.forEachDiscard(fibers, (fiber) => fiber.join))
        const result = $$(ref.get())
        return result === f(1)
      })
      const results = $(Effect.collectAll(Effect.replicate(100, program)))
      assert.isBelow(results.filter(identity).size, 100)
    }).unsafeRunPromise())

  it("fairness assigns lock to fibers in order", () =>
    Do(($) => {
      const f1 = (x: number) => x * 2
      const f2 = (x: number) => x - 10
      const f3 = (x: number) => Math.floor(x / 4)
      const f4 = (x: number) => x + 100
      const f = (x: number) => f4(f3(f2(f1(x))))

      const lock = $(TReentrantLock.make().commit)
      const ref = $(Ref.make(1))
      const deferred0 = $(Deferred.make<never, void>())
      $(Effect.scoped(lock.withLockScoped.zipRight(deferred0.await())).fork)
      const deferred1 = $(Deferred.make<never, void>())
      const fiber1 = $(
        deferred1.succeed(undefined).zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f1)))).fork
      )
      const deferred2 = $(Deferred.make<never, void>())
      const fiber2 = $(
        deferred1.await().zipRight(deferred2.succeed(undefined)).zipRight(
          Effect.scoped(lock.withLockScoped.zipRight(ref.update(f2)))
        ).fork
      )
      const deferred3 = $(Deferred.make<never, void>())
      const fiber3 = $(
        deferred2.await().zipRight(deferred3.succeed(undefined)).zipRight(
          Effect.scoped(lock.withLockScoped.zipRight(ref.update(f3)))
        ).fork
      )
      const fiber4 = $(deferred3.await().zipRight(Effect.scoped(lock.withLockScoped.zipRight(ref.update(f4)))).fork)
      const fibers = List(fiber1, fiber2, fiber3, fiber4)
      $(deferred0.succeed(undefined))
      $(Effect.forEachDiscard(fibers, (fiber) => fiber.join))
      const result = $(ref.get())
      assert.strictEqual(result, f(1))
    }).unsafeRunPromise())
})
