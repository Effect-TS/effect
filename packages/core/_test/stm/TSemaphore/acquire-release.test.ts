function repeat<E, A>(self: STM<never, E, A>, n: number): STM<never, E, A> {
  if (n < 1) {
    return STM.dieSync(`The value of "n" must be greater than 0, received: ${n}`)
  }
  if (n === 1) {
    return self
  }
  return self > STM.suspend(repeat(self, n - 1))
}

describe.concurrent("TSemaphore", () => {
  describe.concurrent("acquire and release", () => {
    it("acquiring and releasing a permit should not change the availability", () =>
      Do(($) => {
        const semaphore = $(TSemaphore.make(10))
        const result = $(
          semaphore.acquire
            .zipRight(semaphore.release)
            .zipRight(semaphore.available)
        )
        assert.strictEqual(result, 10)
      }).commit.unsafeRunPromise())

    it("used capacity must be equal to the # of acquires minus # of releases", () =>
      Do(($) => {
        const capacity = 10
        const acquire = 7
        const release = 4
        const semaphore = $(TSemaphore.make(capacity))
        const result = $(
          repeat(semaphore.acquire, acquire)
            .zipRight(repeat(semaphore.release, release))
            .zipRight(semaphore.available)
        )
        const usedCapacity = acquire - release
        assert.strictEqual(result, capacity - usedCapacity)
      }).commit.unsafeRunPromise())

    it("acquireN/releaseN(n) is acquire/release repeated N times", () =>
      Do(($) => {
        const capacity = 50
        function acquireRelease(
          semaphore: TSemaphore,
          acquire: (n: number) => STM<never, never, void>,
          release: (n: number) => STM<never, never, void>
        ): STM<never, never, readonly [number, number]> {
          return Do(($) => {
            $(acquire(50))
            const usedCapacity = $(semaphore.available)
            $(release(capacity))
            const freeCapacity = $(semaphore.available)
            return [usedCapacity, freeCapacity] as const
          })
        }
        const semaphore = $(TSemaphore.make(capacity))
        const acquireReleaseN = acquireRelease(
          semaphore,
          (n) => semaphore.acquireN(n),
          (n) => semaphore.releaseN(n)
        )
        const acquireReleaseRep = acquireRelease(
          semaphore,
          (n) => repeat(semaphore.acquire, n),
          (n) => repeat(semaphore.release, n)
        )
        const resN = $(acquireReleaseN)
        const resRep = $(acquireReleaseRep)
        assert.strictEqual(resN[0], resRep[0])
        assert.strictEqual(resN[1], resRep[1])
        assert.strictEqual(resN[0], 0)
        assert.strictEqual(resN[1], capacity)
      }).commit.unsafeRunPromise())

    it("withPermit automatically releases the permit if the effect is interrupted", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const semaphore = $(TSemaphore.make(1).commit)
        const effect = deferred.succeed(undefined)
          .apply(semaphore.withPermit)
          .zipRight(Effect.never)
        const fiber = $(effect.fork)
        $(deferred.await)
        $(fiber.interrupt)
        const result = $(semaphore.available.commit)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())

    it("withPermit acquire is interruptible", () =>
      Do(($) => {
        const called = vi.fn()
        const semaphore = $(TSemaphore.make(0).commit)
        const effect = Effect.sync(() => called()).apply(semaphore.withPermit)
        const fiber = $(effect.fork)
        $(fiber.interrupt)
        const result = $(fiber.join.exit)
        assert.isTrue(result.isInterrupted)
        assert.isTrue(called.mock.calls.length === 0)
      }).unsafeRunPromise())
  })
})
