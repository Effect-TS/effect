import { Chunk } from "../../../src/collection/immutable/Chunk"
import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
import { Ref } from "../../../src/io/Ref"
import { waitForSize } from "./test-utils"

describe("Queue", () => {
  describe("parallel", () => {
    it("parallel takes and sequential offers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bind("fiber", ({ queue }) => Effect.forkAll(Chunk.fill(10, () => queue.take)))
        .bindValue("values", () => Chunk.range(1, 10))
        .tap(({ queue, values }) =>
          values
            .map((n) => queue.offer(n))
            .reduce(Effect.succeed(false), (acc, curr) => acc > curr)
        )
        .bind("v", ({ fiber }) => fiber.join())

      const { v, values } = await program.unsafeRunPromise()

      expect(v.toArray()).toEqual(values.toArray())
    })

    it("parallel offers and sequential takes", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("values", () => Chunk.range(1, 10))
        .bind("fiber", ({ queue, values }) =>
          Effect.forkAll(values.map((n) => queue.offer(n)))
        )
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("output", () => Ref.make<List<number>>(List.empty()))
        .tap(({ output, queue }) =>
          queue.take.flatMap((i) => output.update((list) => list.append(i))).repeatN(9)
        )
        .bind("list", ({ output }) => output.get)
        .tap(({ fiber }) => fiber.join())

      const { list, values } = await program.unsafeRunPromise()

      expect(list.toArray()).toEqual(values.toArray())
    })
  })
})
