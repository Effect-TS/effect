import { List } from "../../../src/collection/immutable/List"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  describe("takeN", () => {
    it("returns immediately if there is enough elements", async () => {
      const program = Queue.bounded<number>(100)
        .tap((queue) => queue.offerAll(List(1, 2, 3, 4, 5)))
        .flatMap((queue) => queue.takeN(3).map((chunk) => chunk.toArray()))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3])
    })

    it("returns an empty list if a negative number or zero is specified", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .tap(({ queue }) => queue.offerAll(List(1, 2, 3)))
        .bind("resNegative", ({ queue }) =>
          queue.takeN(-3).map((chunk) => chunk.toArray())
        )
        .bind("resZero", ({ queue }) => queue.takeN(0).map((chunk) => chunk.toArray()))

      const { resNegative, resZero } = await program.unsafeRunPromise()

      expect(resNegative).toEqual([])
      expect(resZero).toEqual([])
    })

    it("blocks until the required number of elements is available", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(100))
        .bindValue("updater", ({ queue }) => queue.offer(10).forever())
        .bindValue("getter", ({ queue }) =>
          queue.takeN(5).map((chunk) => chunk.toArray())
        )
        .flatMap(({ getter, updater }) => getter.race(updater))

      const result = await program.unsafeRunPromise()

      expect(result.length).toBe(5)
    })
  })
})
