function repeat<E, A>(self: STM<never, E, A>, n: number): STM<never, E, A> {
  if (n < 1) {
    return STM.die(`The value of "n" must be greater than 0, received: ${n}`)
  }
  if (n === 1) {
    return self
  }
  return self > STM.suspend(repeat(self, n - 1))
}

describe.concurrent("TSemaphore", () => {
  describe.concurrent("acquire and release", () => {
    it("acquiring and releasing a permit should not change the availability", async () => {
      const program = TSemaphore.make(10)
        .flatMap(
          (semaphore) => semaphore.acquire > semaphore.release > semaphore.available
        )
        .commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("used capacity must be equal to the # of acquires minus # of releases", async () => {
      const capacity = 10
      const acquire = 7
      const release = 4

      const program = TSemaphore.make(capacity)
        .flatMap(
          (semaphore) =>
            repeat(semaphore.acquire, acquire) >
              repeat(semaphore.release, release) >
              semaphore.available
        )
        .commit

      const result = await program.unsafeRunPromise()

      const usedCapacity = acquire - release

      assert.strictEqual(result, capacity - usedCapacity)
    })

    it("acquireN/releaseN(n) is acquire/release repeated N times", async () => {
      const capacity = 50

      function acquireRelease(
        semaphore: TSemaphore,
        acquire: (n: number) => STM<never, never, void>,
        release: (n: number) => STM<never, never, void>
      ): STM<never, never, Tuple<[number, number]>> {
        return STM.gen(function*(_) {
          yield* _(acquire(50))

          const usedCapacity = yield* _(semaphore.available)

          yield* _(release(capacity))

          const freeCapacity = yield* _(semaphore.available)

          return Tuple(usedCapacity, freeCapacity)
        })
      }

      const stm = STM.gen(function*(_) {
        const semaphore = yield* _(TSemaphore.make(capacity))
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
        const resN = yield* _(acquireReleaseN)
        const resRep = yield* _(acquireReleaseRep)
        return { resN, resRep }
      })

      const program = stm.commit

      const { resN, resRep } = await program.unsafeRunPromise()

      assert.strictEqual(resN.get(0), resRep.get(0))
      assert.strictEqual(resN.get(1), resRep.get(1))
      assert.strictEqual(resN.get(0), 0)
      assert.strictEqual(resN.get(1), capacity)
    })

    it("withPermit automatically releases the permit if the effect is interrupted", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .bind("semaphore", () => TSemaphore.make(1).commit)
        .bindValue(
          "effect",
          ({ deferred, semaphore }) => deferred.succeed(undefined).apply(semaphore.withPermit) > Effect.never
        )
        .bind("fiber", ({ effect }) => effect.fork)
        .tap(({ deferred }) => deferred.await())
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ semaphore }) => semaphore.available.commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("withPermit acquire is interruptible", async () => {
      const called = vi.fn()
      const program = Effect.Do()
        .bind("semaphore", () => TSemaphore.make(0).commit)
        .bindValue("effect", ({ semaphore }) => Effect.succeed(() => called()).apply(semaphore.withPermit))
        .bind("fiber", ({ effect }) => effect.fork)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ fiber }) => fiber.join)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.isInterrupted)
      assert.isTrue(called.mock.calls.length === 0)
    })
  })
})
