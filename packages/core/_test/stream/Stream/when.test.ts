import { constFalse, constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("when", () => {
    it("returns the stream if the condition is satisfied", async () => {
      const program = Stream.when(true, Stream.range(0, 10)).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })

    it("returns an empty stream if the condition is not satisfied", async () => {
      const program = Stream.when(false, Stream.range(0, 10)).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("dies if the condition throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.when(() => {
        throw error
      }, Stream.range(0, 10)).runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })
  })

  describe.concurrent("whenEffect", () => {
    it("returns the stream if the effectful condition is satisfied", async () => {
      const program = Stream.whenEffect(
        Effect.sync(constTrue),
        Stream.range(0, 10)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })

    it("returns an empty stream if the effectful condition is not satisfied", async () => {
      const program = Stream.whenEffect(
        Effect.sync(constFalse),
        Stream.range(0, 10)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("fails if the effectful condition fails", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenEffect(
        Effect.failSync(error),
        Stream.range(0, 10)
      ).runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(error))
    })
  })

  describe.concurrent("whenCase", () => {
    it("returns the resulting stream if the given partial function is defined for the given value", async () => {
      const program = Stream.whenCase(
        Maybe.some(5),
        (n: Maybe<number>) => n.isSome() ? Maybe.some(Stream(n.value)) : Maybe.none
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(5))
    })

    it("returns an empty stream if the given partial function is not defined for the given value", async () => {
      const program = Stream.whenCase(
        Maybe.none,
        (n: Maybe<number>) => n.isSome() ? Maybe.some(Stream(n)) : Maybe.none
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("dies if evaluating the given value throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCase(
        () => {
          throw error
        },
        (n: Maybe<number>) => (n.isSome() ? Maybe.some(Stream(n.value)) : Maybe.none)
      ).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })

    it("dies if the given partial function throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCase(undefined, (): Maybe<Stream<never, unknown, unknown>> => {
        throw error
      }).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })
  })

  describe.concurrent("whenCaseEffect", () => {
    it("returns the resulting stream if the given partial function is defined for the given effectful value", async () => {
      const program = Stream.whenCaseEffect(
        Effect.sync(Maybe.some(5)),
        (n: Maybe<number>) => (n.isSome() ? Maybe.some(Stream(n.value)) : Maybe.none)
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(5))
    })

    it("returns an empty stream if the given partial function is not defined for the given effectful value", async () => {
      const program = Stream.whenCaseEffect(
        Effect.none,
        (n: Maybe<number>) => n.isSome() ? Maybe.some(Stream(n.value)) : Maybe.none
      ).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("fails if the effectful value is a failure", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCaseEffect(
        Effect.failSync(error),
        (n: Maybe<number>) => n.isSome() ? Maybe.some(Stream(n)) : Maybe.none
      ).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(error))
    })

    it("dies if the given partial function throws an exception", async () => {
      const error = new RuntimeError("boom")
      const program = Stream.whenCaseEffect(Effect.unit, (): Maybe<Stream<never, unknown, unknown>> => {
        throw error
      }).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })
  })
})
