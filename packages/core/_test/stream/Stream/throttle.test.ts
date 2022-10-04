import { DurationInternal } from "@tsplus/stdlib/data/Duration"

describe.concurrent("Stream", () => {
  describe.concurrent("throttleEnforce", () => {
    it("free elements", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleEnforce(0, new DurationInternal(Number.MAX_SAFE_INTEGER), () => 0)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("no bandwidth", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleEnforce(0, new DurationInternal(Number.MAX_SAFE_INTEGER), () => 1)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })
  })

  describe.concurrent("throttleShape", () => {
    it("free elements", async () => {
      const program = Stream(1, 2, 3, 4)
        .throttleShape(1, new DurationInternal(Number.MAX_SAFE_INTEGER), () => 0)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })

    it("throttles", async () => {
      const program = Queue.bounded<number>(10).flatMap((queue) =>
        Effect.scoped(
          Stream.fromQueue(queue)
            .throttleShape(1, (30).millis, (chunk) => chunk.reduce(0, (a, b) => a + b))
            .toPull
            .flatMap((pull) =>
              Effect.Do()
                .tap(() => queue.offer(1))
                .bind("result1", () => pull)
                .tap(() => queue.offer(2))
                .bind("result2", () => pull)
                .tap(() => Effect.sleep((120).millis))
                .tap(() => queue.offer(3))
                .bind("result3", () => pull)
                .map(({ result1, result2, result3 }) =>
                  Tuple(
                    result1,
                    result2,
                    result3
                  )
                )
            )
        )
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(Equals.equals(result, Tuple(Chunk(1), Chunk(2), Chunk(3))))
    })

    it("infinite bandwidth", async () => {
      const program = Clock.currentTime.flatMap((start) =>
        Queue.bounded<number>(10).flatMap((queue) =>
          Effect.scoped(
            Stream.fromQueue(queue)
              .throttleShape(1, (0).millis, () => 100_000)
              .toPull
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
                    Tuple(end - start, Tuple(result1, result2, result3))
                  )
              )
          )
        )
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result[0] < 1000)
      assert.isTrue(Equals.equals(result[1], Tuple(Chunk(1), Chunk(2), Chunk(3))))
    })

    it("with burst", async () => {
      const program = Queue.bounded<number>(10).flatMap((queue) =>
        Effect.scoped(
          Stream.fromQueue(queue)
            .throttleShape(
              1,
              (10).millis,
              (chunk) => chunk.reduce(0, (a, b) => a + b),
              2
            )
            .toPull
            .flatMap((pull) =>
              Effect.Do()
                .tap(() => queue.offer(1))
                .bind("result1", () => pull)
                .tap(() => Effect.sleep((40).millis))
                .tap(() => queue.offer(2))
                .bind("result2", () => pull)
                .tap(() => Effect.sleep((80).millis))
                .tap(() => queue.offer(3))
                .bind("result3", () => pull)
                .map(({ result1, result2, result3 }) =>
                  Tuple(
                    result1,
                    result2,
                    result3
                  )
                )
            )
        )
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(Equals.equals(result, Tuple(Chunk(1), Chunk(2), Chunk(3))))
    })
  })
})
