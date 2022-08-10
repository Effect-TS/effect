import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("drop", () => {
    it("drop", async () => {
      const n = 2
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.drop(n).runCollect,
        expected: stream.runCollect.map((chunk) => chunk.drop(n))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("doesn't swallow errors", async () => {
      const program = (Stream.failSync("ouch") + Stream(1)).drop(1).runDrain.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("dropRight", () => {
    it("simple example", async () => {
      const n = 2
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.dropRight(n).runCollect,
        expected: stream.runCollect.map((chunk) => chunk.dropRight(n))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("doesn't swallow errors", async () => {
      const program = (Stream(1) + Stream.failSync("ouch")).dropRight(1).runDrain.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })

  describe.concurrent("dropUntil", () => {
    it("simple example", async () => {
      const p = (n: number) => n >= 3
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.dropUntil(p).runCollect,
        expected: stream.runCollect.map((chunk) => chunk.dropWhile((n) => !p(n)).drop(1))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })
  })

  describe.concurrent("dropWhile", () => {
    it("dropWhile", async () => {
      const p = (n: number) => n >= 3
      const stream = Stream(1, 2, 3, 4, 5)
      const program = Effect.struct({
        actual: stream.dropWhile(p).runCollect,
        expected: stream.runCollect.map((chunk) => chunk.dropWhile(p))
      })

      const { actual, expected } = await program.unsafeRunPromise()

      assert.isTrue(actual == expected)
    })

    it("short circuits", async () => {
      const program = (Stream(1) + Stream.failSync("ouch"))
        .take(1)
        .dropWhile(constTrue)
        .runDrain
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(undefined))
    })
  })
})
