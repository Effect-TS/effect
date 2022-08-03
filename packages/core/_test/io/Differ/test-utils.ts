export function diffLaws<Value, Patch>(
  differ: Differ<Value, Patch>,
  gen: Gen<TestEnvironment, Value>,
  equal: (a: Value, b: Value) => boolean
): void {
  describe.concurrent("differ laws", () => {
    it.effect("combining patches is associative", () =>
      Do(($) => {
        const values = $(gen.runCollectN(4))
        const value1 = values.unsafeGet(0)
        const value2 = values.unsafeGet(1)
        const value3 = values.unsafeGet(2)
        const value4 = values.unsafeGet(3)
        const patch1 = differ.diff(value1, value2)
        const patch2 = differ.diff(value2, value3)
        const patch3 = differ.diff(value3, value4)
        const left = differ.combine(differ.combine(patch1, patch2), patch3)
        const right = differ.combine(patch1, differ.combine(patch2, patch3))
        assert.isTrue(equal(differ.patch(left, value1), differ.patch(right, value1)))
      }))

    it.effect("combining a patch with an empty patch is an identity", () =>
      Do(($) => {
        const values = $(gen.runCollectN(2))
        const oldValue = values.unsafeGet(0)
        const newValue = values.unsafeGet(1)
        const patch = differ.diff(oldValue, newValue)
        const left = differ.combine(patch, differ.empty)
        const right = differ.combine(differ.empty, patch)
        assert.isTrue(equal(differ.patch(left, oldValue), newValue))
        assert.isTrue(equal(differ.patch(right, oldValue), newValue))
      }))

    it.effect("diffing a value with itself returns an empty patch", () =>
      Do(($) => {
        const values = $(gen.runCollectN(1))
        const value = values.unsafeGet(0)
        assert.deepStrictEqual(differ.diff(value, value), differ.empty)
      }))

    it.effect("diffing and then patching is an identity", () =>
      Do(($) => {
        const values = $(gen.runCollectN(2))
        const oldValue = values.unsafeGet(0)
        const newValue = values.unsafeGet(1)
        const patch = differ.diff(oldValue, newValue)
        assert.isTrue(equal(differ.patch(patch, oldValue), newValue))
      }))

    it.effect("patching with an empty patch is an identity", () =>
      Do(($) => {
        const values = $(gen.runCollectN(1))
        const value = values.unsafeGet(0)
        assert.isTrue(equal(differ.patch(differ.empty, value), value))
      }))
  })
}
