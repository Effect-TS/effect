import { assert, describe, it } from "@effect/vitest"
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
})
