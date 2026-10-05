import { assert, it } from "@effect/vitest"
import { PubSub } from "effect"

// packages/effect/src/PubSub.ts:2472 (ensureCapacity) only rejects `capacity <= 0`, so NaN reaches
// BoundedPubSubArb and `publishAll` loops forever (src/PubSub.ts:1716). The `makeAtomicBounded` JSDoc
// (src/PubSub.ts:522) states: "The capacity must be greater than zero; invalid capacities throw
// synchronously before an atomic implementation is created." NaN is not greater than zero.
it("makeAtomicBounded rejects a NaN capacity", () => {
  assert.throws(() => PubSub.makeAtomicBounded<number>(Number.NaN))
})
