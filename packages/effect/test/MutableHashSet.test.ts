import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { MutableHashSet } from "effect"
import { assertNoDeferredEqualHashCalls } from "./utils/equalHashCalls.ts"

describe("MutableHashSet", () => {
  it("isMutableHashSet distinguishes Effect mutable hash sets from native sets", () => {
    assertTrue(MutableHashSet.isMutableHashSet(MutableHashSet.make("a", "b")))
    assertFalse(MutableHashSet.isMutableHashSet(new Set(["a", "b"])))
  })

  it("calls value Equal and Hash implementations only synchronously during set operations", () =>
    assertNoDeferredEqualHashCalls((key) => {
      const set = MutableHashSet.make(key("a"), key("b"))
      MutableHashSet.add(set, key("c"))
      MutableHashSet.has(set, key("a"))
      MutableHashSet.remove(set, key("c"))
    }))
})
