import { useAtomRef } from "@effect/atom-vue"
import { assert, describe, it } from "@effect/vitest"
import * as AtomRef from "effect/unstable/reactivity/AtomRef"
import { effectScope, nextTick, shallowRef, watch } from "vue"

describe("atom-vue", () => {
  describe("useAtomRef", () => {
    it("publishes the current value when the selected ref changes", async () => {
      const first = AtomRef.make(1)
      const second = AtomRef.make(10)
      const selected = shallowRef(first)
      const scope = effectScope()
      try {
        const value = scope.run(() => useAtomRef(() => selected.value))
        assert.ok(value)
        assert.strictEqual(value.value, 1)

        first.set(2)
        await nextTick()
        assert.strictEqual(value.value, 2)

        selected.value = second
        await nextTick()
        assert.strictEqual(value.value, 10)
      } finally {
        scope.stop()
      }
    })

    it("detaches the old ref, follows the new ref's writes and stops with its scope", async () => {
      const first = AtomRef.make(1)
      const second = AtomRef.make(10)
      const selected = shallowRef(first)
      const scope = effectScope()
      try {
        const value = scope.run(() => useAtomRef(() => selected.value))
        assert.ok(value)
        assert.strictEqual(value.value, 1)

        first.set(2)
        await nextTick()
        assert.strictEqual(value.value, 2)

        selected.value = second
        await nextTick()
        const beforeOldWrite = value.value
        first.set(3)
        await nextTick()
        assert.strictEqual(value.value, beforeOldWrite)

        second.set(11)
        await nextTick()
        assert.strictEqual(value.value, 11)

        scope.stop()
        second.set(12)
        first.set(4)
        await nextTick()
        assert.strictEqual(value.value, 11)
      } finally {
        scope.stop()
      }
    })

    it("subscribes before publishing to synchronous watchers", async () => {
      const first = AtomRef.make(1)
      const second = AtomRef.make(10)
      const selected = shallowRef(first)
      const scope = effectScope()
      try {
        const value = scope.run(() => {
          const value = useAtomRef(() => selected.value)
          watch(value, (next) => {
            if (next === 10) second.set(11)
          }, { flush: "sync" })
          return value
        })
        assert.ok(value)

        selected.value = second
        await nextTick()
        assert.strictEqual(second.value, 11)
        assert.strictEqual(value.value, 11)
      } finally {
        scope.stop()
      }
    })
  })
})
