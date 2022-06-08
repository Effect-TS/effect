describe.concurrent("TQueue", () => {
  describe.concurrent("lookup", () => {
    it("size", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.unbounded())

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const size = $(tq.size)

        return size === 5
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("peek the next value", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.unbounded())

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const next = $(tq.peek)
        const size = $(tq.size)

        return next === 1 && size === 5
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("peekOption value", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.unbounded<number>())

        $(tq.offerAll(List(1, 2, 3, 4, 5)))

        const next = $(tq.peekOption)
        const size = $(tq.size)

        return next == Option.some(1) && size === 5
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("peekOption empty queue", async () => {
      const tx = Do(($) => {
        const tq = $(TQueue.unbounded())

        const next = $(tq.peekOption)

        return next.isNone()
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("check isEmpty", async () => {
      const tx = Do(($) => {
        const tq1 = $(TQueue.unbounded())
        const tq2 = $(TQueue.unbounded())

        $(tq1.offerAll(List(1, 2, 3, 4, 5)))

        const qb1 = $(tq1.isEmpty)
        const qb2 = $(tq2.isEmpty)

        return qb1 === false && qb2 === true
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("check isFull", async () => {
      const tx = Do(($) => {
        const tq1 = $(TQueue.bounded(5))
        const tq2 = $(TQueue.bounded(5))

        $(tq1.offerAll(List(1, 2, 3, 4, 5)))

        const qb1 = $(tq1.isFull)
        const qb2 = $(tq2.isFull)

        return qb1 === true && qb2 === false
      }).commit()

      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
