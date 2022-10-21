describe.concurrent("Effect", () => {
  describe.concurrent("cached", () => {
    it.effect("returns new instances after duration", () =>
      Do(($) => {
        function incrementAndGet(ref: Ref<number>): Effect<never, never, number> {
          return ref.updateAndGet((n) => n + 1)
        }
        const ref = $(Ref.make(0))
        const cache = $(incrementAndGet(ref).cached((60).minutes))
        const a = $(cache)
        $(TestClock.adjust((59).minutes))
        const b = $(cache)
        $(TestClock.adjust((1).minutes))
        const c = $(cache)
        $(TestClock.adjust((59).minutes))
        const d = $(cache)
        assert.strictEqual(a, b)
        assert.notStrictEqual(b, c)
        assert.strictEqual(c, d)
      }))

    it("correctly handles an infinite duration time to live", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const getAndIncrement = ref.modify((curr) => [curr, curr + 1])
        const cached = $(getAndIncrement.cached(Duration.Infinity))
        const a = $(cached)
        const b = $(cached)
        const c = $(cached)
        assert.strictEqual(a, 0)
        assert.strictEqual(b, 0)
        assert.strictEqual(c, 0)
      }).unsafeRunPromise())
  })

  describe.concurrent("cachedInvalidate", () => {
    it.effect("returns new instances after duration", () =>
      Do(($) => {
        function incrementAndGet(ref: Ref<number>): Effect<never, never, number> {
          return ref.updateAndGet((n) => n + 1)
        }
        const ref = $(Ref.make(0))
        const tuple = $(incrementAndGet(ref).cachedInvalidate((60).minutes))
        const [cached, invalidate] = tuple
        const a = $(cached)
        $(TestClock.adjust((59).minutes))
        const b = $(cached)
        $(invalidate)
        const c = $(cached)
        $(TestClock.adjust((1).minutes))
        const d = $(cached)
        $(TestClock.adjust((59).minutes))
        const e = $(cached)
        assert.strictEqual(a, b)
        assert.notStrictEqual(b, c)
        assert.strictEqual(c, d)
        assert.notStrictEqual(d, e)
      }))
  })
})
