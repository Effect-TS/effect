import { List } from "../../../src/collection/immutable/List"
import { Option } from "../../../src/data/Option"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("poll", () => {
    it("poll on empty queue", async () => {
      const program = Queue.bounded<number>(5).flatMap((queue) => queue.poll())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("poll on queue just emptied", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => List.range(1, 5))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .tap(({ queue }) => queue.takeAll)
        .flatMap(({ queue }) => queue.poll())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("multiple polls", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(5))
        .bindValue("iter", () => List.range(1, 3))
        .tap(({ iter, queue }) => queue.offerAll(iter))
        .bind("t1", ({ queue }) => queue.poll())
        .bind("t2", ({ queue }) => queue.poll())
        .bind("t3", ({ queue }) => queue.poll())
        .bind("t4", ({ queue }) => queue.poll())

      const { t1, t2, t3, t4 } = await program.unsafeRunPromise()

      expect(t1).toEqual(Option.some(1))
      expect(t2).toEqual(Option.some(2))
      expect(t3).toEqual(Option.none)
      expect(t4).toEqual(Option.none)
    })
  })
})
