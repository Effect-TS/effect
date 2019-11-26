import * as assert from "assert";

import * as Q from "../../src/effect/queue";
import * as T from "../../src/effect";
import { Do } from "fp-ts-contrib/lib/Do";

describe("QueueSafe", () => {
  it("should use unbounded queue", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.unboundedQueue<number>())
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .bindL("c", ({ queue }) => queue.take)
      .return(({ a, b, c }) => a + b + c);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });

  it("should use bounded queue", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.boundedQueue<number>(3))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .bindL("c", ({ queue }) => queue.take)
      .return(({ a, b, c }) => a + b + c);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });

  it("should use dropping queue", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.droppingQueue<number>(3))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .bindL("c", ({ queue }) => queue.take)
      .return(({ a, b, c }) => a + b + c);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });

  it("should use dropping queue - 2", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.droppingQueue<number>(2))
      .doL(({ queue }) => queue.offer(2))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .return(({ a, b }) => a + b);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });

  it("should use sliding queue", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.slidingQueue<number>(3))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .bindL("c", ({ queue }) => queue.take)
      .return(({ a, b, c }) => a + b + c);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });

  it("should use sliding queue - 2", async () => {
    const program = Do(T.effectMonad)
      .bind("queue", Q.slidingQueue<number>(2))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(1))
      .doL(({ queue }) => queue.offer(2))
      .bindL("a", ({ queue }) => queue.take)
      .bindL("b", ({ queue }) => queue.take)
      .return(({ a, b }) => a + b);

    const result = await T.runToPromise(program);

    assert.deepEqual(result, 3);
  });
});
