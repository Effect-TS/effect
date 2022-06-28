const pollSchedule = <E, A>(): Schedule<Tuple<[number, void]>, never, Maybe<Exit<E, A>>, Maybe<Exit<E, A>>> =>
  (Schedule.recurs(100) > Schedule.identity<Maybe<Exit<E, A>>>()).whileOutput((_) => _.isNone())

describe.concurrent("TReentrantLock", () => {
  describe.concurrent("locks", () => {
    it("1 read lock", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const count = $(Effect.scoped(lock.readLock.flatMap((count) => Effect.succeed(count))))

        return count === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("2 read locks from same fiber", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const count = $(
          Effect.scoped(
            lock.readLock.flatMap(() => Effect.scoped(lock.readLock.flatMap((count) => Effect.succeed(count))))
          )
        )

        return count === 2
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("2 read locks from different fibers", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const rlatch = $(Deferred.make<never, void>())
        const mlatch = $(Deferred.make<never, void>())
        const wlatch = $(Deferred.make<never, void>())

        $(
          Effect.scoped(
            lock.readLock.flatMap((count) => mlatch.succeed(undefined) > rlatch.await().as(count))
          ).fork
        )

        $(mlatch.await())

        const reader2 = $(
          Effect.scoped(lock.readLock.flatMap((count) => wlatch.succeed(undefined).as(count))).fork
        )

        $(wlatch.await())

        const count = $(reader2.join)

        return count === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("1 write lock then 1 read lock, different fibers", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const rlatch = $(Deferred.make<never, void>())
        const mlatch = $(Deferred.make<never, void>())
        const wlatch = $(Deferred.make<never, void>())

        $(
          Effect.scoped(
            lock.writeLock.flatMap((count) => rlatch.succeed(undefined) > wlatch.await().as(count))
          ).fork
        )

        $(rlatch.await())

        const reader = $((mlatch.succeed(undefined) > Effect.scoped(lock.readLock)).fork)

        $(mlatch.await())

        const locks = $(lock.readLocks.zipWith(lock.writeLocks, (a, b) => a + b).commit)
        const option = $(reader.poll.repeat(pollSchedule()))

        $(wlatch.succeed(undefined))

        const rcount = $(reader.join)

        return rcount === 1 && option.isNone() && locks === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("1 write lock then 1 write lock, different fibers", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const rlatch = $(Deferred.make<never, void>())
        const mlatch = $(Deferred.make<never, void>())
        const wlatch = $(Deferred.make<never, void>())

        $(
          Effect.scoped(
            lock.writeLock.flatMap((count) => rlatch.succeed(undefined) > wlatch.await().as(count))
          ).fork
        )

        $(rlatch.await())

        const reader = $((mlatch.succeed(undefined) > Effect.scoped(lock.writeLock)).fork)

        $(mlatch.await())

        const locks = $(lock.readLocks.zipWith(lock.writeLocks, (a, b) => a + b).commit)
        const option = $(reader.poll.repeat(pollSchedule()))

        $(wlatch.succeed(undefined))

        const rcount = $(reader.join)

        return rcount === 1 && option.isNone() && locks === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("write lock followed by read lock from same fiber", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const ref = $(Ref.make(0))
        const rcount = $(Effect.scoped(
          lock.writeLock.flatMap(() =>
            Effect.scoped(
              lock.readLock.flatMap((count) => lock.writeLocks.commit.flatMap((_) => ref.set(_)).as(count))
            )
          )
        ))
        const wcount = $(ref.get())

        return rcount === 1 && wcount === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("upgrade read lock to write lock from same fiber", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const ref = $(Ref.make(0))
        const rcount = $(Effect.scoped(
          lock.readLock.flatMap(() =>
            Effect.scoped(
              lock.writeLock.flatMap((count) => lock.writeLocks.commit.flatMap((_) => ref.set(_)).as(count))
            )
          )
        ))
        const wcount = $(ref.get())

        return rcount === 1 && wcount === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("upgrade read lock to write lock from same fiber", async () => {
      const program = Do(($) => {
        const lock = $(TReentrantLock.make().commit)
        const rlatch = $(Deferred.make<never, void>())
        const mlatch = $(Deferred.make<never, void>())
        const wlatch = $(Deferred.make<never, void>())

        $(
          Effect.scoped(
            lock.readLock.flatMap((count) => mlatch.succeed(undefined) > rlatch.await().as(count))
          ).fork
        )

        $(mlatch.await())

        const writer = $(
          Effect.scoped(
            lock.readLock.flatMap(() =>
              wlatch.succeed(undefined) >
                Effect.scoped(lock.writeLock.flatMap((count) => Effect.succeed(count)))
            )
          ).fork
        )

        $(wlatch.await())

        const option = $(writer.poll.repeat(pollSchedule))

        $(rlatch.succeed(undefined))

        const count = $(writer.join)

        return option.isNone() && count === 1
      })

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
