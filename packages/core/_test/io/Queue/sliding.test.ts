import { waitForSize } from "@effect-ts/core/test/io/Queue/test-utils";

describe.concurrent("Queue", () => {
  describe.concurrent("sliding", () => {
    it("with offer", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .tap(({ queue }) => queue.offer(1))
        .bind("v1", ({ queue }) => queue.offer(2))
        .bind("v2", ({ queue }) => queue.offer(3))
        .bind("rest", ({ queue }) => queue.takeAll);

      const { rest, v1, v2 } = await program.unsafeRunPromise();

      assert.isTrue(rest == Chunk(2, 3));
      assert.isTrue(v1);
      assert.isTrue(v2);
    });

    it("with offerAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bind("value", ({ queue }) => queue.offerAll(List(1, 2, 3)))
        .bind("size", ({ queue }) => queue.size);

      const { size, value } = await program.unsafeRunPromise();

      assert.isTrue(value);
      assert.strictEqual(size, 2);
    });

    it("with enough capacity", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(100))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ queue }) => queue.offer(3))
        .bind("rest", ({ queue }) => queue.takeAll);

      const { rest } = await program.unsafeRunPromise();

      assert.isTrue(rest == Chunk(1, 2, 3));
    });

    it("with offerAll and takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bind("value", ({ queue }) => queue.offerAll(List(1, 2, 3, 4, 5, 6)))
        .bind("result", ({ queue }) => queue.takeAll);

      const { result, value } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(5, 6));
      assert.isTrue(value);
    });

    it("with pending taker", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(2))
        .bindValue("iter", () => Chunk.range(1, 4))
        .tap(({ queue }) => queue.take.fork())
        .tap(({ queue }) => waitForSize(queue, -1))
        .bind("oa", ({ iter, queue }) => queue.offerAll(iter))
        .bind("taken", ({ queue }) => queue.take);

      const { oa, taken } = await program.unsafeRunPromise();

      assert.strictEqual(taken, 3);
      assert.isTrue(oa);
    });

    it("check offerAll returns true", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.sliding<number>(5))
        .bindValue("iter", () => Chunk.range(1, 3))
        .flatMap(({ iter, queue }) => queue.offerAll(iter));

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
