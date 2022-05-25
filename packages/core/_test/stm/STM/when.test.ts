describe.concurrent("STM", () => {
  describe.concurrent("when combinators", () => {
    it("when true", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(true, tRef.set(true)) > tRef.get()).commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("when false", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(false, tRef.set(true)) > tRef.get()).commit())

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("whenSTM true", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n === 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })

    it("whenSTM false", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n !== 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
    })

    it("whenCase executes correct branch only", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCase(
            Option.emptyOf<number>(),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCase(Option.some(0), (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none)
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      assert.isFalse(result1)
      assert.isTrue(result2)
    })

    it("whenCaseSTM executes condition effect and correct branch", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCaseSTM(
            STM.succeed(Option.emptyOf<number>()),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCaseSTM(
            STM.succeed(Option.some(0)),
            (option) => option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      assert.isFalse(result1)
      assert.isTrue(result2)
    })
  })
})
