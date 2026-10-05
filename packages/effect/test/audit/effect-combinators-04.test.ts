import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, TxRef } from "effect"

// Effect.tx (packages/effect/src/Effect.ts:14620) treats any inherited Transaction service as an
// active transaction. Per the Effect.tx JSDoc (Effect.ts:14576, 14584-14585) only an *active*
// transaction's journal is reused; once the outer boundary has committed, a fresh Effect.tx in a
// still-running child fiber must start its own boundary and publish its writes.
it.effect("Effect.tx in a child forked inside a completed tx publishes its writes", () =>
  Effect.gen(function*() {
    const ref = TxRef.makeUnsafe(0)
    const gate = yield* Deferred.make<void>()
    const child = yield* Effect.tx(
      Effect.forkChild(Deferred.await(gate).pipe(Effect.andThen(Effect.tx(TxRef.set(ref, 42)))))
    )
    yield* Deferred.succeed(gate, undefined)
    yield* Fiber.join(child)
    assert.strictEqual(yield* TxRef.get(ref), 42)
  }))
