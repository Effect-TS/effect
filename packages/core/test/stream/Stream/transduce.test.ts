import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("transduce", () => {
    it("simple example", async () => {
      const program = Stream("1", "2", ",", "3", "4")
        .transduce(Sink.collectAllWhile((c: string) => /\d/.test(c)))
        .map((chunk) => chunk.join(""))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("12", "34"))
    })

    it("no remainder", async () => {
      const program = Stream(1, 2, 3, 4)
        .transduce(
          Sink.fold(
            100,
            (n) => n % 2 === 0,
            (a, b) => a + b
          )
        )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(101, 105, 104))
    })

    it("with a sink that always signals more", async () => {
      const program = Stream(1, 2, 3)
        .transduce(Sink.fold(0, constTrue, (a, b) => a + b))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(6))
    })

    it("propagate managed error", async () => {
      const fail = "I'm such a failure!"
      const program = Stream(1, 2, 3).transduce(Sink.failSync(fail)).runCollect.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(fail))
    })
  })
})
