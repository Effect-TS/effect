import { useAtomRef } from "@effect/atom-solid"
import { assert, describe, it } from "@effect/vitest"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"
import { createRoot, createSignal } from "solid-js"

describe("useAtomRef", () => {
  it("publishes the selected ref's value, follows writes and releases subscriptions", () => {
    const first = AtomRef.make(1)
    const second = AtomRef.make(10)
    const { value, select, dispose } = createRoot((dispose) => {
      const [selected, select] = createSignal(first)
      return { value: useAtomRef(selected), select, dispose }
    })
    try {
      assert.strictEqual(value(), 1)

      first.set(2)
      assert.strictEqual(value(), 2)

      select(second)
      assert.strictEqual(value(), 10)

      first.set(3)
      assert.strictEqual(value(), 10)

      second.set(11)
      assert.strictEqual(value(), 11)

      dispose()
      second.set(12)
      first.set(4)
      assert.strictEqual(value(), 11)
    } finally {
      dispose()
    }
  })
})
