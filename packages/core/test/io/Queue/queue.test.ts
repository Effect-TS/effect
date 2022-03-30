import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"

describe("Queue", () => {
  it("handles falsy values", async () => {
    const program = Queue.unbounded<number>()
      .tap((queue) => queue.offer(0))
      .flatMap((queue) => queue.take)

    const result = await program.unsafeRunPromise()

    expect(result).toBe(0)
  })

  it("queue is ordered", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.unbounded<number>())
      .tap(({ queue }) => queue.offer(1))
      .tap(({ queue }) => queue.offer(2))
      .tap(({ queue }) => queue.offer(3))
      .bind("v1", ({ queue }) => queue.take)
      .bind("v2", ({ queue }) => queue.take)
      .bind("v3", ({ queue }) => queue.take)

    const { v1, v2, v3 } = await program.unsafeRunPromise()

    expect(v1).toBe(1)
    expect(v2).toBe(2)
    expect(v3).toBe(3)
  })
})
