describe.concurrent("Effect", () => {
  describe.concurrent("mapBoth", () => {
    it("maps over both error and value channels", async () => {
      const program = Effect.fail(10)
        .mapBoth((n) => n.toString(), identity)
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("10"))
    })
  })

  describe.concurrent("mapTryCatch", () => {
    it("returns an effect whose success is mapped by the specified side effecting function", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("123").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 123)
    })

    it("translates any thrown exceptions into typed failed effects", async () => {
      function parseInt(s: string): number {
        const n = Number.parseInt(s)
        if (Number.isNaN(n)) {
          throw new IllegalArgumentException()
        }
        return n
      }

      const program = Effect.succeed("hello").mapTryCatch(parseInt, identity)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(
        result.isFailure() && result.cause.isDieType() && result.cause.value instanceof IllegalArgumentException
      )
    })
  })

  describe.concurrent("negate", () => {
    it("on true returns false", async () => {
      const program = Effect.succeed(true).negate()

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("on false returns true", async () => {
      const program = Effect.succeed(false).negate()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})
