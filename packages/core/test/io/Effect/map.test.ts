function parseInt(s: string): number {
  const n = Number.parseInt(s)
  if (Number.isNaN(n)) {
    throw new IllegalArgumentException()
  }
  return n
}

describe.concurrent("Effect", () => {
  describe.concurrent("mapBoth", () => {
    it("maps over both error and value channels", () =>
      Do(($) => {
        const result = $(Effect.fail(10).mapBoth((n) => n.toString(), identity).either)
        assert.isTrue(result == Either.left("10"))
      }).unsafeRunPromise())
  })

  describe.concurrent("mapTryCatch", () => {
    it("returns an effect whose success is mapped by the specified side effecting function", () =>
      Do(($) => {
        const result = $(Effect.succeed("123").mapTryCatch(parseInt, identity))
        assert.strictEqual(result, 123)
      }).unsafeRunPromise())

    it("translates any thrown exceptions into typed failed effects", () =>
      Do(($) => {
        const result = $(Effect.succeed("hello").mapTryCatch(parseInt, identity).exit)
        assert.isTrue(
          result.isFailure() && result.cause.isDieType() &&
            result.cause.value instanceof IllegalArgumentException
        )
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("negate", () => {
    it("on true returns false", () =>
      Do(($) => {
        const result = $(Effect.sync(true).negate)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("on false returns true", () =>
      Do(($) => {
        const result = $(Effect.sync(false).negate)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})
