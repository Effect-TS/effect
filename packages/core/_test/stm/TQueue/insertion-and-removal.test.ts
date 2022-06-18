describe.concurrent("TQueue", () => {
  describe.concurrent("insertion and removal", () => {
    it("offer & take", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offer(1))
        $(tq.offer(2))
        $(tq.offer(3))

        const one = $(tq.take)
        const two = $(tq.take)
        const three = $(tq.take)

        return List(one, two, three)
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result == List(1, 2, 3))
    })
    it("takeUpTo", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const ans = $(tq.takeUpTo(3))
        const size = $(tq.size)

        return size === 2 && ans == Chunk(1, 2, 3)
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("offerAll & takeAll", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const ans = $(tq.takeAll)

        return ans == Chunk(1, 2, 3, 4, 5)
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("takeUpTo larger than container", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const ans = $(tq.takeUpTo(7))
        const size = $(tq.size)

        return size === 0 && ans == Chunk(1, 2, 3, 4, 5)
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("poll value", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offerAll(List(1, 2, 3)))

        const ans = $(tq.poll)

        return ans == Maybe.some(1)
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("poll empty queue", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        const ans = $(tq.poll)

        return ans.isNone()
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("seek element", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.bounded<number>(5))

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const ans = $(tq.seek((_) => _ === 3))
        const size = $(tq.size)

        return ans === 3 && size === 2
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
