import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Order, TxPriorityQueue, TxRef } from "effect"

// packages/effect/src/TxPriorityQueue.ts:387 — `offerAll` consumes its iterable inside the TxRef.update
// callback, which re-runs on transaction retry. Contract (JSDoc): "inserts all elements from an iterable";
// Effect.tx retries transparently, so the committed attempt must still insert the full batch.
it.effect("TxPriorityQueue.offerAll preserves a one-shot iterable across transaction retries", () =>
  Effect.gen(function*() {
    const queue = yield* TxPriorityQueue.empty<number>(Order.Number)
    const gate = yield* TxRef.make(false)
    const offer = TxPriorityQueue.offerAll(
      queue,
      (function*() {
        yield 2
        yield 1
      })()
    )
    const fiber = yield* Effect.forkChild(
      Effect.tx(Effect.gen(function*() {
        yield* offer
        if (!(yield* TxRef.get(gate))) return yield* Effect.txRetry
      })),
      { startImmediately: true }
    )
    yield* TxRef.set(gate, true)
    yield* Fiber.join(fiber)
    assert.deepStrictEqual(yield* TxPriorityQueue.toArray(queue), [1, 2])
  }))
