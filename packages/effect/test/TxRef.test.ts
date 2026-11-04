import { assert, describe, it } from "@effect/vitest"
import { Effect, Ref, TxRef } from "effect"

describe("TxRef", () => {
  it.effect("isTxRef accepts a TxRef and rejects a Ref", () =>
    Effect.gen(function*() {
      assert.isTrue(TxRef.isTxRef(yield* TxRef.make(0)))
      assert.isFalse(TxRef.isTxRef(yield* Ref.make(0)))
    }))
})
