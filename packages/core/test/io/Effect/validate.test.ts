describe.concurrent("Effect", () => {
  describe.concurrent("validate", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.validate(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("accumulate errors and ignore successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10)
        const result = $(
          Effect.validate(chunk, (n) => n % 2 === 0 ? Effect.sync(n) : Effect.failSync(n)).flip
        )
        assert.isTrue(result == Chunk(1, 3, 5, 7, 9))
      }).unsafeRunPromise())

    it("accumulate successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10)
        const result = $(Effect.validate(chunk, Effect.succeed))
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("fails", () =>
      Do(($) => {
        const result = $(Effect.sync(1).validate(Effect.failSync(2)).sandbox.either)
        assert.isTrue(
          result.mapLeft((cause) => cause) == Either.left(Cause.fail(2))
        )
      }).unsafeRunPromise())

    it("combines both cause", () =>
      Do(($) => {
        const result = $(Effect.failSync(1).validate(Effect.failSync(2)).sandbox.either)
        assert.isTrue(
          result.mapLeft((cause) => cause) == Either.left(Cause.fail(1) + Cause.fail(2))
        )
      }).unsafeRunPromise())
  })

  describe.concurrent("validateDiscard", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.validateDiscard(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())
  })

  describe.concurrent("validatePar", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(1000, () => 0)
        const result = $(Effect.validatePar(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("accumulate errors and ignore successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10)
        const result = $(
          Effect.validatePar(chunk, (n) => n % 2 === 0 ? Effect.sync(n) : Effect.failSync(n)).flip
        )
        assert.isTrue(result == Chunk(1, 3, 5, 7, 9))
      }).unsafeRunPromise())

    it("accumulate successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10)
        const result = $(Effect.validatePar(chunk, Effect.succeed))
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())
  })

  describe.concurrent("validateParDiscard", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.validateParDiscard(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())
  })

  describe.concurrent("validateFirst", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.validateFirst(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("runs sequentially and short circuits on first success validation", () =>
      Do(($) => {
        function f(n: number): Effect<never, number, number> {
          return n === 6 ? Effect.sync(n) : Effect.failSync(n)
        }
        const chunk = Chunk.range(1, 10)
        const counter = $(Ref.make<number>(0))
        const result = $(
          Effect.validateFirst(chunk, (n) => counter.update((n) => n + 1).zipRight(f(n)))
        )
        const count = $(counter.get)
        assert.strictEqual(result, 6)
        assert.strictEqual(count, 6)
      }).unsafeRunPromise())

    it("returns errors in correct order", () =>
      Do(($) => {
        const list = List(2, 4, 6, 3, 5, 6)
        const result = $(Effect.validateFirst(list, Effect.fail).flip)
        assert.isTrue(result == Chunk(2, 4, 6, 3, 5, 6))
      }).unsafeRunPromise())
  })

  describe.concurrent("validateFirstPar", () => {
    it("returns all errors if never valid", () =>
      Do(($) => {
        const chunk = Chunk.fill(1000, () => 0)
        const result = $(Effect.validateFirstPar(chunk, Effect.fail).flip)
        assert.isTrue(result == chunk)
      }).unsafeRunPromise())

    it("returns success if valid", () =>
      Do(($) => {
        function f(n: number): Effect<never, number, number> {
          return n === 6 ? Effect.sync(n) : Effect.failSync(n)
        }
        const chunk = Chunk.range(1, 10)
        const result = $(Effect.validateFirstPar(chunk, f))
        assert.strictEqual(result, 6)
      }).unsafeRunPromise())
  })

  describe.concurrent("validateWith", () => {
    it("succeeds", () =>
      Do(($) => {
        const result = $(Effect.sync(1).validateWith(Effect.sync(2), (a, b) => a + b))
        assert.strictEqual(result, 3)
      }).unsafeRunPromise())
  })
})
