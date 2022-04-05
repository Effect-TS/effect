// import { Chunk } from "../../../src/collection/immutable/Chunk"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Duration } from "../../../src/data/Duration"
import { Clock } from "../../../src/io/Clock"
// import { Either } from "../../../src/data/Either"
// import { constTrue } from "../../../src/data/Function"
// import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Queue } from "../../../src/io/Queue"
// import { Exit } from "../../../src/io/Exit"
// import { Promise } from "../../../src/io/Promise"
// import { Ref } from "../../../src/io/Ref"
// import { Sink } from "../../../src/stream/Sink"
import { Stream } from "../../../src/stream/Stream"

describe("Stream", () => {
  describe("throttleEnforce", () => {
    it("free elements", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleEnforce(0, Duration.Infinity, () => 0)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4])
    })

    it("no bandwidth", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleEnforce(0, Duration.Infinity, () => 1)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([])
    })
  })

  describe("throttleShape", () => {
    it("free elements", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleShape(1, Duration.Infinity, () => 0)
        .runCollect()

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4])
    })

    it("throttles", async () => {
      const program = Queue.bounded<number>(10).flatMap((queue) =>
        Effect.scoped(
          Stream.fromQueue(queue)
            .throttleShape(1, Duration(30), (chunk) => chunk.reduce(0, (a, b) => a + b))
            .toPull()
            .flatMap((pull) =>
              Effect.Do()
                .tap(() => queue.offer(1))
                .bind("result1", () => pull)
                .tap(() => queue.offer(2))
                .bind("result2", () => pull)
                .tap(() => Effect.sleep(Duration(120)))
                .tap(() => queue.offer(3))
                .bind("result3", () => pull)
                .map(({ result1, result2, result3 }) => [
                  result1.toArray(),
                  result2.toArray(),
                  result3.toArray()
                ])
            )
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([[1], [2], [3]])
    })

    it("infinite bandwidth", async () => {
      const program = Clock.currentTime.flatMap((start) =>
        Queue.bounded<number>(10).flatMap((queue) =>
          Effect.scoped(
            Stream.fromQueue(queue)
              .throttleShape(1, Duration(0), (chunk) => 100_000)
              .toPull()
              .flatMap((pull) =>
                Effect.Do()
                  .tap(() => queue.offer(1))
                  .bind("result1", () => pull)
                  .tap(() => queue.offer(2))
                  .bind("result2", () => pull)
                  .tap(() => queue.offer(3))
                  .bind("result3", () => pull)
                  .bind("end", () => Clock.currentTime)
                  .map(({ end, result1, result2, result3 }) =>
                    Tuple(end - start, [
                      result1.toArray(),
                      result2.toArray(),
                      result3.toArray()
                    ])
                  )
              )
          )
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result.get(0)).toBeLessThan(1000)
      expect(result.get(1)).toEqual([[1], [2], [3]])
    })

    it("with burst", async () => {
      const program = Queue.bounded<number>(10).flatMap((queue) =>
        Effect.scoped(
          Stream.fromQueue(queue)
            .throttleShape(
              1,
              Duration(10),
              (chunk) => chunk.reduce(0, (a, b) => a + b),
              2
            )
            .toPull()
            .flatMap((pull) =>
              Effect.Do()
                .tap(() => queue.offer(1))
                .bind("result1", () => pull)
                .tap(() => Effect.sleep(Duration(40)))
                .tap(() => queue.offer(2))
                .bind("result2", () => pull)
                .tap(() => Effect.sleep(Duration(80)))
                .tap(() => queue.offer(3))
                .bind("result3", () => pull)
                .map(({ result1, result2, result3 }) => [
                  result1.toArray(),
                  result2.toArray(),
                  result3.toArray()
                ])
            )
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([[1], [2], [3]])
    })
  })
})
