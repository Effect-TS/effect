import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Queue } from "effect"

// Queue.clear (packages/effect/src/Queue.ts:1208) classifies the terminal cause with
// Pull.isDoneCause. Its JSDoc says "If the queue has failed, the effect fails with the
// queue's error", and Pull.filterDone preserves failures merged with Done (as Queue.await does).
it.effect("Queue.clear preserves a defect merged with Done", () =>
  Effect.gen(function*() {
    const queue = yield* Queue.unbounded<number, Cause.Done>()
    yield* Queue.failCause(queue, Cause.combine(Cause.fail(Cause.Done()), Cause.die("finalizer boom")))
    const exit = yield* Effect.exit(Queue.clear(queue))
    assert.deepStrictEqual(exit, Exit.die("finalizer boom"))
  }))
