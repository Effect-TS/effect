describe.concurrent("TReentrantLock", () => {
  describe.concurrent("locks", () => {
    it("1 read lock", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit())
        const count = $(Effect.scoped(lock.readLock().flatMap((count) => Effect.succeed(count))))

        return count === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("2 read locks from same fiber", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit())
        const count = $(
          Effect.scoped(
            lock.readLock().flatMap(() => Effect.scoped(lock.readLock().flatMap((count) => Effect.succeed(count))))
          )
        )

        return count === 2
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("2 read locks from different fibers", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit())
        const rlatch = $(Deferred.make<never, void>())
        const mlatch = $(Deferred.make<never, void>())
        const wlatch = $(Deferred.make<never, void>())

        $(
          Effect.scoped(
            lock.readLock().flatMap((count) => mlatch.succeed(undefined as void) > rlatch.await().as(count))
          ).fork()
        )

        $(mlatch.await())

        const reader2 = $(
          Effect.scoped(lock.readLock().flatMap((count) => wlatch.succeed(undefined as void).as(count))).fork()
        )

        $(wlatch.await())

        const count = $(reader2.join())

        return count === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
