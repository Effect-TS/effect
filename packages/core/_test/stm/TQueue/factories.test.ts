describe.concurrent("TQueue", () => {
  describe.concurrent("factories", () => {
    it("bounded", async () => {
      const capacity = 5
      const tq = TQueue.bounded(capacity).map((_) => _.capacity).commit()

      const result = await tq.unsafeRunPromise()

      assert.isTrue(result === capacity)
    })
    it("unbounded", async () => {
      const tq = TQueue.unbounded().map((_) => _.capacity).commit()

      const result = await tq.unsafeRunPromise()

      assert.isTrue(result === Number.MAX_SAFE_INTEGER)
    })
  })
})
