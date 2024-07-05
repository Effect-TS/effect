import { Effect, Exit, RcMap, Scope } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

describe("RcMap", () => {
  it.effect("deallocation", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const mapScope = yield* Scope.make()
      const map = yield* RcMap.make((key: string) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            acquired.push(key)
            return key
          }),
          () => Effect.sync(() => released.push(key))
        )
      ).pipe(
        Scope.extend(mapScope)
      )

      assert.deepStrictEqual(acquired, [])
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      assert.deepStrictEqual(acquired, ["foo"])
      assert.deepStrictEqual(released, ["foo"])

      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      yield* RcMap.get(map, "bar").pipe(Scope.extend(scopeA))
      yield* Effect.scoped(RcMap.get(map, "bar"))
      yield* RcMap.get(map, "baz").pipe(Scope.extend(scopeB))
      yield* Effect.scoped(RcMap.get(map, "baz"))
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz"])
      assert.deepStrictEqual(released, ["foo"])
      yield* Scope.close(scopeB, Exit.void)
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz"])
      assert.deepStrictEqual(released, ["foo", "baz"])
      yield* Scope.close(scopeA, Exit.void)
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz"])
      assert.deepStrictEqual(released, ["foo", "baz", "bar"])

      const scopeC = yield* Scope.make()
      yield* RcMap.get(map, "qux").pipe(Scope.extend(scopeC))
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz", "qux"])
      assert.deepStrictEqual(released, ["foo", "baz", "bar"])

      yield* Scope.close(mapScope, Exit.void)
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz", "qux"])
      assert.deepStrictEqual(released, ["foo", "baz", "bar", "qux"])

      const exit = yield* RcMap.get(map, "boom").pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.isInterrupted(exit))
    }))
})
