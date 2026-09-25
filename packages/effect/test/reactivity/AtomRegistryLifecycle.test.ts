import { afterEach, assert, beforeEach, describe, it, vitest } from "@effect/vitest"
import { Effect } from "effect"
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity"

describe("AtomRegistry", { concurrent: false }, () => {
  beforeEach(async () => {
    vitest.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] })
    await Effect.runPromise(Effect.yieldNow)
  })
  afterEach(() => {
    vitest.useRealTimers()
  })

  it("a build superseded after it threw cannot write the rebuilt node", () => {
    const p = Atom.make(1)
    const q = Atom.make(0)
    const n = Atom.readable((get) => {
      const v = get(p)
      if (v === 1) {
        get.subscribe(q, (x) => get.setSelf(x))
        throw new Error("boom")
      }
      return v
    })
    const r = AtomRegistry.make()
    assert.throws(() => r.get(n), "boom")
    r.set(p, 2)
    assert.strictEqual(r.get(n), 2)
    r.set(q, 99)
    assert.strictEqual(r.get(n), 2)
    r.dispose()
  })
})
