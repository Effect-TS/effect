import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { Atom, AtomRegistry, Hydration } from "effect/reactivity"

const dehydrated = (key: string, value: unknown, resultPromise?: Promise<unknown>): Hydration.DehydratedAtomValue => ({
  "~effect/reactivity/Hydration/DehydratedAtom": true,
  key,
  value,
  dehydratedAt: 0,
  resultPromise
})

describe("Hydration", () => {
  describe("hydrate", () => {
    it("returns a function that drops the values no read has taken", () => {
      const state = Atom.make(0).pipe(Atom.serializable({ key: "unread", schema: Schema.Number }))
      const r = AtomRegistry.make()
      const dispose = Hydration.hydrate(r, [dehydrated("unread", 10)])

      dispose()

      assert.strictEqual(r.get(state), 0)
    })

    it("keeps the values a read has taken", () => {
      const state = Atom.make(0).pipe(Atom.serializable({ key: "read", schema: Schema.Number }))
      const r = AtomRegistry.make()
      const dispose = Hydration.hydrate(r, [dehydrated("read", 10)])
      r.mount(state)

      dispose()

      assert.strictEqual(r.get(state), 10)
      r.dispose()
    })

    it("keeps a value queued for the same key by a later call", () => {
      const state = Atom.make(0).pipe(Atom.serializable({ key: "requeued", schema: Schema.Number }))
      const r = AtomRegistry.make()
      const dispose = Hydration.hydrate(r, [dehydrated("requeued", 10)])
      Hydration.hydrate(r, [dehydrated("requeued", 20)])

      dispose()

      assert.strictEqual(r.get(state), 20)
    })

    it("ignores promises that resolve after the returned function is called", async () => {
      const state = Atom.make(0).pipe(Atom.serializable({ key: "pending", schema: Schema.Number }))
      const r = AtomRegistry.make()
      let resolve!: (value: unknown) => void
      const promise = new Promise<unknown>((f) => {
        resolve = f
      })
      const dispose = Hydration.hydrate(r, [dehydrated("pending", 0, promise)])
      r.mount(state)

      dispose()
      resolve(10)
      await promise

      assert.strictEqual(r.get(state), 0)
      r.dispose()
    })
  })
})
