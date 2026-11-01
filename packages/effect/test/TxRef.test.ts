import { assert, describe, it } from "@effect/vitest"
import { Effect, Ref, TxRef } from "effect"

describe("TxRef", () => {
  it.effect("isTxRef accepts a TxRef and rejects anything else", () =>
    Effect.gen(function*() {
      assert.isTrue(TxRef.isTxRef(yield* TxRef.make(0)))
      for (const value of [yield* Ref.make(0), {}, null]) {
        assert.isFalse(TxRef.isTxRef(value))
      }
    }))
})
