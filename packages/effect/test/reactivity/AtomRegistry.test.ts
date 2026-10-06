import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Atom, AtomRegistry } from "effect/reactivity"

describe("AtomRegistry", () => {
  describe("setInitialValue", () => {
    it("keeps the value through the first computation and tracks dependencies", () => {
      const source = Atom.make(0)
      const mapped = Atom.map(source, (n) => n + 1)
      const r = AtomRegistry.make()
      r.setInitialValue(mapped, 10)
      r.mount(mapped)

      assert.strictEqual(r.get(mapped), 10)

      r.set(source, 1)
      assert.strictEqual(r.get(mapped), 2)
      r.dispose()
    })

    it("gives the value to the initialValueTarget", () => {
      let computed = 0
      const source = Atom.make(() => {
        computed++
        return 1
      })
      const wrapped = source.pipe(Atom.withReactivity(["key"]))
      const r = AtomRegistry.make()
      r.setInitialValue(wrapped, 10)
      r.mount(wrapped)

      assert.strictEqual(r.get(wrapped), 10)
      assert.strictEqual(r.get(source), 10)
      assert.strictEqual(computed, 1)
      r.dispose()
    })

    it("sets an atom that already has a value", () => {
      const state = Atom.make(0)
      const r = AtomRegistry.make()
      r.mount(state)
      const seen: Array<number> = []
      r.subscribe(state, (value) => seen.push(value))

      r.setInitialValue(state, 10)

      assert.strictEqual(r.get(state), 10)
      assert.deepStrictEqual(seen, [10])
      r.dispose()
    })

    it("matches the initialValues option", () => {
      const state = Atom.make(0)
      const fromOption = AtomRegistry.make({ initialValues: [Atom.initialValue(state, 10)] })
      const fromMethod = AtomRegistry.make()
      fromMethod.setInitialValue(state, 10)

      assert.strictEqual(fromOption.getNodes().get(state)?.currentState(), "stale")
      assert.strictEqual(fromMethod.getNodes().get(state)?.currentState(), "stale")
      assert.strictEqual(fromMethod.get(state), fromOption.get(state))
    })
  })

  describe("retain", () => {
    it("keeps an initial value past the registry's next task without computing the atom", async () => {
      let computed = 0
      const state = Atom.make(() => {
        computed++
        return 0
      })
      const r = AtomRegistry.make()
      r.setInitialValue(state, 10)
      const release = r.retain(state)
      await Effect.runPromise(Effect.yieldNow)

      assert.strictEqual(computed, 0)
      assert.strictEqual(r.getNodes().get(state)?.currentState(), "stale")
      assert.strictEqual(r.get(state), 10)
      release()
      r.dispose()
    })

    it("lets the registry remove the atom once released", async () => {
      const state = Atom.make(0)
      const r = AtomRegistry.make()
      r.setInitialValue(state, 10)
      const release = r.retain(state)
      await Effect.runPromise(Effect.yieldNow)
      release()
      await Effect.runPromise(Effect.yieldNow)

      assert.isFalse(r.getNodes().has(state))
      assert.strictEqual(r.get(state), 0)
    })

    it("keeps the atom until every retain is released", async () => {
      const state = Atom.make(0)
      const r = AtomRegistry.make()
      r.setInitialValue(state, 10)
      const releaseFirst = r.retain(state)
      const releaseSecond = r.retain(state)
      releaseFirst()
      await Effect.runPromise(Effect.yieldNow)

      assert.strictEqual(r.get(state), 10)
      releaseSecond()
      r.dispose()
    })

    it("keeps a value given to a wrapper on its initialValueTarget", async () => {
      const source = Atom.make(1)
      const wrapped = source.pipe(Atom.withReactivity(["key"]))
      const r = AtomRegistry.make()
      r.setInitialValue(wrapped, 10)
      const release = r.retain(wrapped)
      await Effect.runPromise(Effect.yieldNow)

      assert.strictEqual(r.get(wrapped), 10)
      release()
      r.dispose()
    })
  })
})
