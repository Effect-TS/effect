import { waitForSize } from "@effect/core/test/io/Queue/test-utils"

describe.concurrent("Queue", () => {
  describe.concurrent("parallel", () => {
    it("parallel takes and sequential offers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("fiber", ({ queue }) => Effect.forkAll(Chunk.fill(10, () => queue.take)))
        .bindValue("values", () => Chunk.range(1, 10))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.sync(false), (acc, curr) => acc > curr)
        )
        .bind("v", ({ fiber }) => fiber.join)

      const { v, values } = await program.unsafeRunPromise()

      assert.isTrue(v == values)
    })

    it("parallel offers and sequential takes", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("values", () => Chunk.range(1, 10))
        .bind("fiber", ({ queue, values }) => Effect.forkAll(values.map((n) => queue.offer(n))))
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("output", () => Ref.make(Chunk.empty()))
        .tap(({ output, queue }) =>
          queue.take.flatMap((i) => output.update((list) => list.append(i))).repeatN(9)
        )
        .bind("chunk", ({ output }) => output.get)
        .tap(({ fiber }) => fiber.join)

      const { chunk, values } = await program.unsafeRunPromise()

      assert.isTrue(chunk == values)
    })
  })
})
