describe.concurrent("Cached", () => {
  it.scoped("manual", () =>
    Do(($) => {
      const ref = $(Ref.make(0))
      const cached = $(Cached.manual(ref.get))
      const value1 = $(cached.get)
      const value2 = $(ref.set(1).zipRight(cached.refresh).zipRight(cached.get))
      assert.strictEqual(value1, 0)
      assert.strictEqual(value2, 1)
    }))

  it.scoped("auto", () =>
    Do(($) => {
      const ref = $(Ref.make(0))
      const cached = $(Cached.auto(ref.get, Schedule.spaced((1).seconds)))
      const value1 = $(cached.get)
      const value2 = $(ref.set(1).zipRight(TestClock.adjust((10).seconds)).zipRight(cached.get))
      assert.strictEqual(value1, 0)
      assert.strictEqual(value2, 1)
    }))

  it.scoped("failed refresh doesn't affect cached value", () =>
    Do(($) => {
      const ref = $(Ref.make<Either<string, number>>(Either.right(0)))
      const cached = $(Cached.auto(ref.get.absolve, Schedule.spaced((1).seconds)))
      const value1 = $(cached.get)
      const value2 = $(
        ref.set(Either.left("Uh oh!")).zipRight(TestClock.adjust((10).seconds)).zipRight(cached.get)
      )
      assert.strictEqual(value1, 0)
      assert.strictEqual(value2, 0)
    }))
})
