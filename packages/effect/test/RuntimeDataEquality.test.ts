import { assert, describe, it } from "@effect/vitest"
import type * as EqualModule from "effect/Equal"
import { vi } from "vitest"

// The protocol methods of Exit, Cause and Context compare and hash nested
// values on their own. Each case loads a fresh module graph and calls them
// first, before anything has gone through Equal.equals or Hash.hash. This file
// must therefore not import effect modules statically.
const names = ["success", "failure", "cause", "fail", "die", "context"] as const
type Name = typeof names[number]

const load = async () => {
  vi.resetModules()
  const Cause = await import("effect/Cause")
  const Context = await import("effect/Context")
  const Equal = await import("effect/Equal")
  const Exit = await import("effect/Exit")
  const Hash = await import("effect/Hash")
  const Key = Context.Service<{ readonly n: number }>("Key")
  // Only Cause and Context declare the protocols in their public types
  const values = (n: number) =>
    ({
      success: Exit.succeed({ n }),
      failure: Exit.fail({ n }),
      cause: Cause.fail({ n }),
      fail: Cause.fail({ n }).reasons[0],
      die: Cause.die({ n }).reasons[0],
      context: Context.make(Key, { n })
    }) as unknown as Record<Name, EqualModule.Equal>
  return { Equal, Hash, values }
}

describe("runtime data types", () => {
  it("compare nested values structurally when [Equal.symbol] is called first", async () => {
    const { Equal, values } = await load()
    const self = values(1)
    const same = values(1)
    const other = values(2)
    for (const name of names) {
      assert.isTrue(self[name][Equal.symbol](same[name]), name)
      assert.isFalse(self[name][Equal.symbol](other[name]), name)
    }
  })

  it("hash nested values structurally when [Hash.symbol] is called first", async () => {
    const { Hash, values } = await load()
    const self = values(1)
    const same = values(1)
    const other = values(2)
    for (const name of names) {
      assert.strictEqual(self[name][Hash.symbol](), same[name][Hash.symbol](), name)
    }
    // Context hashes its size only, so two contexts of one service collide
    for (const name of ["success", "failure", "cause", "fail", "die"] as const) {
      assert.notStrictEqual(self[name][Hash.symbol](), other[name][Hash.symbol](), name)
    }
  })
})
