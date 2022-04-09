describe.concurrent("Queue", () => {
  it("handles falsy values", async () => {
    const program = Queue.unbounded<number>()
      .tap((queue) => queue.offer(0))
      .flatMap((queue) => queue.take);

    const result = await program.unsafeRunPromise();

    assert.strictEqual(result, 0);
  });

  it("queue is ordered", async () => {
    const program = Effect.Do()
      .bind("queue", () => Queue.unbounded<number>())
      .tap(({ queue }) => queue.offer(1))
      .tap(({ queue }) => queue.offer(2))
      .tap(({ queue }) => queue.offer(3))
      .bind("v1", ({ queue }) => queue.take)
      .bind("v2", ({ queue }) => queue.take)
      .bind("v3", ({ queue }) => queue.take);

    const { v1, v2, v3 } = await program.unsafeRunPromise();

    assert.strictEqual(v1, 1);
    assert.strictEqual(v2, 2);
    assert.strictEqual(v3, 3);
  });
});
