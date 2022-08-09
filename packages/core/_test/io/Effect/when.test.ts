describe.concurrent("Effect", () => {
  describe.concurrent("when", () => {
    it("executes correct branch only", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(Effect.when(false, ref.set(1)))
        const v1 = $(ref.get)
        $(Effect.when(true, ref.set(2)))
        const v2 = $(ref.get)
        const failure = new Error("expected")
        $(Effect.when(false, Effect.failSync(failure)))
        const failed = $(Effect.when(true, Effect.failSync(failure)).either)
        assert.strictEqual(v1, 0)
        assert.strictEqual(v2, 2)
        assert.isTrue(failed == Either.left(failure))
      }).unsafeRunPromise())
  })

  describe.concurrent("whenCase", () => {
    it("executes correct branch only", () =>
      Do(($) => {
        const v1 = Maybe.empty<number>()
        const v2 = Maybe.some(0)
        const ref = $(Ref.make(false))
        $(Effect.whenCase(v1, (option) =>
          option._tag === "Some" ?
            Maybe.some(ref.set(true)) :
            Maybe.none))
        const res1 = $(ref.get)
        $(Effect.whenCase(v2, (option) =>
          option._tag === "Some" ?
            Maybe.some(ref.set(true)) :
            Maybe.none))
        const res2 = $(ref.get)
        assert.isFalse(res1)
        assert.isTrue(res2)
      }).unsafeRunPromise())
  })

  describe.concurrent("whenCaseEffect", () => {
    it("executes condition effect and correct branch", () =>
      Do(($) => {
        const v1 = Maybe.empty<number>()
        const v2 = Maybe.some(0)
        const ref = $(Ref.make(false))
        $(Effect.whenCaseEffect(Effect.sync(v1), (option) =>
          option._tag === "Some" ?
            Maybe.some(ref.set(true)) :
            Maybe.none))
        const res1 = $(ref.get)
        $(Effect.whenCaseEffect(Effect.sync(v2), (option) =>
          option._tag === "Some" ?
            Maybe.some(ref.set(true)) :
            Maybe.none))
        const res2 = $(ref.get)
        assert.isFalse(res1)
        assert.isTrue(res2)
      }).unsafeRunPromise())
  })

  describe.concurrent("whenEffect", () => {
    it("executes condition effect and correct branch", () =>
      Do(($) => {
        const effectRef = $(Ref.make(0))
        const conditionRef = $(Ref.make(0))
        const conditionTrue = conditionRef.update((n) => n + 1).as(true)
        const conditionFalse = conditionRef.update((n) => n + 1).as(false)
        $(Effect.whenEffect(conditionFalse, effectRef.set(1)))
        const v1 = $(effectRef.get)
        const c1 = $(conditionRef.get)
        $(Effect.whenEffect(conditionTrue, effectRef.set(2)))
        const v2 = $(effectRef.get)
        const c2 = $(conditionRef.get)
        const failure = new Error("expected")
        $(Effect.whenEffect(conditionFalse, Effect.failSync(failure)))
        const failed = $(Effect.whenEffect(conditionTrue, Effect.failSync(failure)).either)
        assert.strictEqual(v1, 0)
        assert.strictEqual(c1, 1)
        assert.strictEqual(v2, 2)
        assert.strictEqual(c2, 2)
        assert.isTrue(failed == Either.left(failure))
      }).unsafeRunPromise())
  })
})
