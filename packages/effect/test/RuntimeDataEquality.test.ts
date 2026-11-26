import { assert, describe, it } from "@effect/vitest"
import { vi } from "vitest"

// Exit, Cause and Context reach Equal.equals and Hash.hash through hooks that
// the first dispatch installs. Each case loads them into a fresh module graph,
// so this file must not import effect modules statically.
const load = async () => {
  vi.resetModules()
  const Cause = await import("effect/Cause")
  const Context = await import("effect/Context")
  const Equal = await import("effect/Equal")
  const Exit = await import("effect/Exit")
  const Hash = await import("effect/Hash")
  return { Cause, Context, Equal, Exit, Hash }
}

describe("runtime data types", () => {
  it("Hash.array hashes elements structurally before any Hash.hash", async () => {
    const { Hash } = await load()
    assert.notStrictEqual(Hash.array([{ n: 1 }]), Hash.array([{ n: 2 }]))
  })

  it("hash nested values structurally from the first Hash.hash", async () => {
    const { Cause, Context, Exit, Hash } = await load()
    const Key = Context.Service<{ readonly n: number }>("Key")
    assert.strictEqual(Hash.hash(Exit.succeed({ n: 1 })), Hash.hash(Exit.succeed({ n: 1 })))
    assert.notStrictEqual(Hash.hash(Exit.succeed({ n: 1 })), Hash.hash(Exit.succeed({ n: 2 })))
    assert.notStrictEqual(Hash.hash(Cause.fail({ n: 1 })), Hash.hash(Cause.fail({ n: 2 })))
    assert.notStrictEqual(Hash.hash(Cause.die({ n: 1 })), Hash.hash(Cause.die({ n: 2 })))
    assert.strictEqual(Hash.hash(Context.make(Key, { n: 1 })), Hash.hash(Context.make(Key, { n: 1 })))
  })

  it("compare nested values structurally from the first Equal.equals", async () => {
    const { Cause, Context, Equal, Exit } = await load()
    const Key = Context.Service<{ readonly n: number }>("Key")
    assert.isTrue(Equal.equals(Exit.succeed({ n: 1 }), Exit.succeed({ n: 1 })))
    assert.isFalse(Equal.equals(Exit.succeed({ n: 1 }), Exit.succeed({ n: 2 })))
    assert.isTrue(Equal.equals(Exit.fail([1]), Exit.fail([1])))
    assert.isTrue(Equal.equals(Cause.die(new Map([[1, { n: 1 }]])), Cause.die(new Map([[1, { n: 1 }]]))))
    assert.isTrue(Equal.equals(Context.make(Key, { n: 1 }), Context.make(Key, { n: 1 })))
    assert.isFalse(Equal.equals(Context.make(Key, { n: 1 }), Context.make(Key, { n: 2 })))
  })
})
