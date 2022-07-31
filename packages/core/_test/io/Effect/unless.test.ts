describe.concurrent("Effect", () => {
  describe.concurrent("unless", () => {
    it("executes correct branch only", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .tap(({ ref }) => ref.set(1).unless(true))
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) => ref.set(2).unless(false))
        .bind("v2", ({ ref }) => ref.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ failure }) => Effect.failSync(failure).unless(true))
        .bind("failed", ({ failure }) => Effect.failSync(failure).unless(false).either)

      const { failed, failure, v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, 0)
      assert.strictEqual(v2, 2)
      assert.isTrue(failed == Either.left(failure))
    })
  })

  describe.concurrent("unlessEffect", () => {
    it("executes condition effect and correct branch", async () => {
      const program = Effect.Do()
        .bind("effectRef", () => Ref.make(0))
        .bind("conditionRef", () => Ref.make(0))
        .bindValue(
          "conditionTrue",
          ({ conditionRef }) => conditionRef.update((n) => n + 1).as(true)
        )
        .bindValue(
          "conditionFalse",
          ({ conditionRef }) => conditionRef.update((n) => n + 1).as(false)
        )
        .tap(({ conditionTrue, effectRef }) => effectRef.set(1).unlessEffect(conditionTrue))
        .bind("v1", ({ effectRef }) => effectRef.get())
        .bind("c1", ({ conditionRef }) => conditionRef.get())
        .tap(({ conditionFalse, effectRef }) => effectRef.set(2).unlessEffect(conditionFalse))
        .bind("v2", ({ effectRef }) => effectRef.get())
        .bind("c2", ({ conditionRef }) => conditionRef.get())
        .bindValue("failure", () => new Error("expected"))
        .tap(({ conditionTrue, failure }) => Effect.failSync(failure).unlessEffect(conditionTrue))
        .bind(
          "failed",
          ({ conditionFalse, failure }) =>
            Effect.failSync(failure).unlessEffect(conditionFalse).either
        )

      const { c1, c2, failed, failure, v1, v2 } = await program.unsafeRunPromise()

      assert.strictEqual(v1, 0)
      assert.strictEqual(c1, 1)
      assert.strictEqual(v2, 2)
      assert.strictEqual(c2, 2)
      assert.isTrue(failed == Either.left(failure))
    })
  })
})
