import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Equal, Hash, MutableHashSet } from "effect"

describe("MutableHashSet", () => {
  it("isMutableHashSet distinguishes Effect mutable hash sets from native sets", () => {
    assertTrue(MutableHashSet.isMutableHashSet(MutableHashSet.make("a", "b")))
    assertFalse(MutableHashSet.isMutableHashSet(new Set(["a", "b"])))
  })

  it("calls value Equal and Hash implementations only synchronously during set operations", async () => {
    let insideOperation = false
    const outOfOperation: Array<string> = []
    const runInside = <A>(f: () => A): A => {
      insideOperation = true
      try {
        return f()
      } finally {
        insideOperation = false
      }
    }

    class GuardedKey implements Equal.Equal {
      constructor(readonly id: string) {}

      [Hash.symbol](): number {
        if (!insideOperation) outOfOperation.push(`hash:${this.id}`)
        return 0
      }

      [Equal.symbol](that: unknown): boolean {
        if (!insideOperation) outOfOperation.push(`equal:${this.id}`)
        return that instanceof GuardedKey && this.id === that.id
      }
    }

    const a = new GuardedKey("a")
    const b = new GuardedKey("b")
    const c = new GuardedKey("c")
    const aLookup = new GuardedKey("a")

    const set = runInside(() => MutableHashSet.make(a, b))
    runInside(() => MutableHashSet.add(set, c))
    const present = runInside(() => MutableHashSet.has(set, aLookup))
    runInside(() => MutableHashSet.remove(set, c))

    await new Promise((resolve) => setTimeout(resolve, 0))

    assertTrue(present)
    deepStrictEqual(outOfOperation, [])
  })
})
