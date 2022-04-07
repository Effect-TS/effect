import { waitForSize } from "@effect/core/test/io/Queue/test-utils";

describe.concurrent("Queue", () => {
  describe.concurrent("offerAll", () => {
    it("with takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(10))
        .bindValue("orders", () => Chunk.range(1, 10))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .tap(({ queue }) => waitForSize(queue, 10))
        .bind("result", ({ queue }) => queue.takeAll);

      const { orders, result } = await program.unsafeRunPromise();

      assert.isTrue(result == orders);
    });

    it("with takeAll and back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders", () => Chunk.range(1, 3))
        .bind("fiber", ({ orders, queue }) => queue.offerAll(orders).fork())
        .bind("size", ({ queue }) => waitForSize(queue, 3))
        .bind("result", ({ queue }) => queue.takeAll)
        .tap(({ fiber }) => fiber.interrupt());

      const { result, size } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(1, 2));
      assert.strictEqual(size, 3);
    });

    it("with takeAll and back pressure + interruption", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders1", () => Chunk.range(1, 2))
        .bindValue("orders2", () => Chunk.range(3, 4))
        .tap(({ orders1, queue }) => queue.offerAll(orders1))
        .bind("fiber", ({ orders2, queue }) => queue.offerAll(orders2).fork())
        .tap(({ queue }) => waitForSize(queue, 4))
        .tap(({ fiber }) => fiber.interrupt())
        .bind("v1", ({ queue }) => queue.takeAll)
        .bind("v2", ({ queue }) => queue.takeAll);

      const { orders1, v1, v2 } = await program.unsafeRunPromise();

      assert.isTrue(v1 == orders1);
      assert.isTrue(v2.isEmpty());
    });

    it("with takeAll and back pressure, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(64))
        .bindValue("orders", () => Chunk.range(1, 128))
        .bind("fiber", ({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 128))
        .bind("result", ({ queue }) => queue.takeAll)
        .tap(({ fiber }) => fiber.interrupt());

      const { result } = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.range(1, 64));
    });

    it("with pending takers", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(50))
        .bindValue("orders", () => Chunk.range(1, 100))
        .bind("takers", ({ orders, queue }) => Effect.forkAll(Chunk.fill(100, () => queue.take)))
        .tap(({ queue }) => waitForSize(queue, -100))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .bind("result", ({ takers }) => takers.join())
        .bind("size", ({ queue }) => queue.size);

      const { orders, result, size } = await program.unsafeRunPromise();

      assert.isTrue(result == orders);
      assert.strictEqual(size, 0);
    });

    it("with pending takers, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(256))
        .bindValue("orders", () => Chunk.range(1, 128))
        .bind("takers", ({ queue }) => Effect.forkAll(Chunk.fill(64, () => queue.take)))
        .tap(({ queue }) => waitForSize(queue, -64))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .bind("result", ({ takers }) => takers.join())
        .bind("size", ({ queue }) => queue.size)
        .bindValue("values", ({ orders }) => orders.take(64));

      const { result, size, values } = await program.unsafeRunPromise();

      assert.isTrue(result == values);
      assert.strictEqual(size, 64);
    });

    it("with pending takers, check ordering of taker resolution", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(200))
        .bindValue("values", () => Chunk.range(1, 100))
        .bind("takers", ({ queue }) => Effect.forkAll(Chunk.fill(100, () => queue.take)))
        .tap(({ queue }) => waitForSize(queue, -100))
        .bind("fiber", ({ queue }) => Effect.forkAll(Chunk.fill(100, () => queue.take)))
        .tap(({ queue }) => waitForSize(queue, -200))
        .tap(({ queue, values }) => queue.offerAll(values))
        .bind("result", ({ takers }) => takers.join())
        .bind("size", ({ queue }) => queue.size)
        .tap(({ fiber }) => fiber.interrupt());

      const { result, size, values } = await program.unsafeRunPromise();

      assert.isTrue(result == values);
      assert.strictEqual(size, -100);
    });

    it("with take and back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders", () => Chunk.range(1, 3))
        .tap(({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take);

      const { v1, v2, v3 } = await program.unsafeRunPromise();

      assert.strictEqual(v1, 1);
      assert.strictEqual(v2, 2);
      assert.strictEqual(v3, 3);
    });

    it("multiple with back pressure", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(2))
        .bindValue("orders1", () => Chunk.range(1, 3))
        .bindValue("orders2", () => Chunk.range(4, 5))
        .tap(({ orders1, queue }) => queue.offerAll(orders1).fork())
        .tap(({ queue }) => waitForSize(queue, 3))
        .tap(({ orders2, queue }) => queue.offerAll(orders2).fork())
        .tap(({ queue }) => waitForSize(queue, 5))
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take)
        .bind("v4", ({ queue }) => queue.take)
        .bind("v5", ({ queue }) => queue.take);

      const { v1, v2, v3, v4, v5 } = await program.unsafeRunPromise();

      assert.strictEqual(v1, 1);
      assert.strictEqual(v2, 2);
      assert.strictEqual(v3, 3);
      assert.strictEqual(v4, 4);
      assert.strictEqual(v5, 5);
    });

    it("with takeAll, check ordering", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(1000))
        .bindValue("orders", () => Chunk.range(2, 1000))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ orders, queue }) => queue.offerAll(orders))
        .tap(({ queue }) => waitForSize(queue, 1000))
        .flatMap(({ queue }) => queue.takeAll);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.range(1, 1000));
    });

    it("combination of offer, offerAll, take, takeAll", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.bounded<number>(32))
        .bindValue("orders", () => Chunk.range(3, 35))
        .tap(({ queue }) => queue.offer(1))
        .tap(({ queue }) => queue.offer(2))
        .tap(({ orders, queue }) => queue.offerAll(orders).fork())
        .tap(({ queue }) => waitForSize(queue, 35))
        .bind("v", ({ queue }) => queue.takeAll)
        .bind("v1", ({ queue }) => queue.take)
        .bind("v2", ({ queue }) => queue.take)
        .bind("v3", ({ queue }) => queue.take);

      const { v, v1, v2, v3 } = await program.unsafeRunPromise();

      assert.isTrue(v == Chunk.range(1, 32));
      assert.strictEqual(v1, 33);
      assert.strictEqual(v2, 34);
      assert.strictEqual(v3, 35);
    });
  });
});
