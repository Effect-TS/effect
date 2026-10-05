import { Schema } from "effect"
import { describe, it } from "vitest"
import { assertFalse } from "../utils/assert.ts"

describe("equality-data-01", () => {
  // Equal.ts:352 (compareHashed, used by makeCompareSet) returns true without checking for unmatched
  // right-hand entries. Equivalence must be symmetric (Equivalence.ts:26), so a proper subset
  // must compare unequal in both argument orders.
  it("ReadonlySet equivalence rejects a proper subset on the left", () => {
    const equivalence = Schema.toEquivalence(Schema.ReadonlySet(Schema.Number))
    assertFalse(equivalence(new Set([1]), new Set([1, 2])))
  })
})
