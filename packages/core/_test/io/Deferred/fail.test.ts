describe.concurrent("Deferred", () => {
  describe.concurrent("fail", () => {
    it("fail a deferred using fail", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<string, number>())
        .bind("success", ({ deferred }) => deferred.fail("error with fail"))
        .bind("result", ({ deferred }) => deferred.await().exit())

      const { result, success } = await program.unsafeRunPromise()

      assert.isTrue(success)
      assert.isTrue(result.isFailure())
    })

    it("fail a deferred using complete", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<string, number>())
        .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
        .bind("success", ({ deferred, ref }) =>
          deferred.complete(
            ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
          ))
        .bind("v1", ({ deferred }) => deferred.await().exit())
        .bind("v2", ({ deferred }) => deferred.await().exit())

      const { success, v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(success)
      assert.isTrue(v1.isFailure())
      assert.isTrue(v2.isFailure())
    })

    it("fail a deferred using completeWith", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<string, number>())
        .bind("ref", () => Ref.make(Chunk.from(["first error", "second error"])))
        .bind("success", ({ deferred, ref }) =>
          deferred.completeWith(
            ref.modify((as) => Tuple(as.unsafeHead(), as.unsafeTail())).flip()
          ))
        .bind("v1", ({ deferred }) => deferred.await().exit())
        .bind("v2", ({ deferred }) => deferred.await().exit())

      const { success, v1, v2 } = await program.unsafeRunPromise()

      assert.isTrue(success)
      assert.isTrue(v1.isFailure())
      assert.isTrue(v2.isFailure())
    })
  })
})
