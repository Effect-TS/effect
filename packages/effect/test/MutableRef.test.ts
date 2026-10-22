import { assert, describe, it } from "@effect/vitest"
import { Equal, Hash, MutableRef } from "effect"

describe("MutableRef", () => {
  it("uses reference equality with a stable hash", () => {
    const left = MutableRef.make(0)
    const right = MutableRef.make(0)
    const hash = Hash.hash(left)

    assert.isFalse(Equal.equals(left, right))
    MutableRef.set(left, 1)
    assert.strictEqual(Hash.hash(left), hash)
  })
})
