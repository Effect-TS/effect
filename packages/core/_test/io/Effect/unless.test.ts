describe.concurrent("Effect", () => {
  describe.concurrent("unless", () => {
    it("executes correct branch only", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(ref.set(1).unless(true))
        const v1 = $(ref.get)
        $(ref.set(2).unless(false))
        const v2 = $(ref.get)
        const failure = new Error("expected")
        $(Effect.failSync(failure).unless(true))
        const failed = $(Effect.failSync(failure).unless(false).either)
        assert.strictEqual(v1, 0)
        assert.strictEqual(v2, 2)
        assert.isTrue(failed == Either.left(failure))
      }).unsafeRunPromise())
  })

  describe.concurrent("unlessEffect", () => {
    it("executes condition effect and correct branch", () =>
      Do(($) => {
        const effectRef = $(Ref.make(0))
        const conditionRef = $(Ref.make(0))
        const conditionTrue = conditionRef.update((n) => n + 1).as(true)
        const conditionFalse = conditionRef.update((n) => n + 1).as(false)
        $(effectRef.set(1).unlessEffect(conditionTrue))
        const v1 = $(effectRef.get)
        const c1 = $(conditionRef.get)
        $(effectRef.set(2).unlessEffect(conditionFalse))
        const v2 = $(effectRef.get)
        const c2 = $(conditionRef.get)
        const failure = new Error("expected")
        $(Effect.failSync(failure).unlessEffect(conditionTrue))
        const failed = $(Effect.failSync(failure).unlessEffect(conditionFalse).either)
        assert.strictEqual(v1, 0)
        assert.strictEqual(c1, 1)
        assert.strictEqual(v2, 2)
        assert.strictEqual(c2, 2)
        assert.isTrue(failed == Either.left(failure))
      }).unsafeRunPromise())
  })
})
