import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("peel", () => {
    it("simple example", async () => {
      const sink: Sink<never, never, number, number, Chunk<number>> = Sink.take(3)
      const program = Effect.scoped(
        Stream.fromChunks(Chunk(1, 2, 3), Chunk(4, 5, 6))
          .peel(sink)
          .flatMap(({ tuple: [chunk, rest] }) => Effect.succeedNow(chunk).zip(rest.runCollect()))
      )

      const {
        tuple: [result, leftover]
      } = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
      assert.isTrue(leftover == Chunk(4, 5, 6))
    })

    it("propagates errors", async () => {
      const stream = Stream.repeatEffect(Effect.fail("fail"))
      const sink: Sink<never, string, number, number, Chunk<number>> = Sink.fold(
        Chunk.empty<number>(),
        constTrue,
        (chunk, a: number) => chunk.append(a)
      )
      const program = Effect.scoped(stream.peel(sink))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("fail"))
    })
  })
})
