import { Cause, Data, Effect, Exit, RcMap, Scope, TestClock } from "effect"
import { assert, describe, it } from "effect/test/utils/extend"

describe("RcMap", () => {
  it.effect("deallocation", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const mapScope = yield* Scope.make()
      const map = yield* RcMap.make({
        lookup: (key: string) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              acquired.push(key)
              return key
            }),
            () => Effect.sync(() => released.push(key))
          )
      }).pipe(
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

  it.scoped("idleTimeToLive", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const map = yield* RcMap.make({
        lookup: (key: string) =>
          Effect.acquireRelease(
            Effect.sync(() => {
              acquired.push(key)
              return key
            }),
            () => Effect.sync(() => released.push(key))
          ),
        idleTimeToLive: 1000
      })

      assert.deepStrictEqual(acquired, [])
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      assert.deepStrictEqual(acquired, ["foo"])
      assert.deepStrictEqual(released, [])

      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(released, ["foo"])

      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")
      assert.deepStrictEqual(acquired, ["foo", "bar"])
      assert.deepStrictEqual(released, ["foo"])

      yield* TestClock.adjust(500)
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")
      assert.deepStrictEqual(acquired, ["foo", "bar"])
      assert.deepStrictEqual(released, ["foo"])

      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(released, ["foo", "bar"])

      yield* Effect.scoped(RcMap.get(map, "baz"))
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz"])
      yield* RcMap.invalidate(map, "baz")
      assert.deepStrictEqual(acquired, ["foo", "bar", "baz"])
      assert.deepStrictEqual(released, ["foo", "bar", "baz"])
    }))

  it.scoped("capacity", () =>
    Effect.gen(function*() {
      const map = yield* RcMap.make({
        lookup: (key: string) => Effect.succeed(key),
        capacity: 2,
        idleTimeToLive: 1000
      })

      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")

      const exit = yield* RcMap.get(map, "baz").pipe(Effect.scoped, Effect.exit)
      assert.deepStrictEqual(
        exit,
        Exit.fail(new Cause.ExceededCapacityException(`RcMap attempted to exceed capacity of 2`))
      )

      yield* TestClock.adjust(1000)
      assert.strictEqual(yield* Effect.scoped(RcMap.get(map, "baz")), "baz")
    }))

  it.scoped("complex key", () =>
    Effect.gen(function*() {
      class Key extends Data.Class<{ readonly id: number }> {}
      const map = yield* RcMap.make({
        lookup: (key: Key) => Effect.succeed(key.id),
        capacity: 1
      })

      assert.strictEqual(yield* RcMap.get(map, new Key({ id: 1 })), 1)
      // no failure means a hit
      assert.strictEqual(yield* RcMap.get(map, new Key({ id: 1 })), 1)
    }))

  it.scoped("keys lookup", () =>
    Effect.gen(function*() {
      const map = yield* RcMap.make({
        lookup: (key: string) => Effect.succeed(key)
      })

      yield* RcMap.get(map, "foo")
      yield* RcMap.get(map, "bar")
      yield* RcMap.get(map, "baz")

      assert.deepStrictEqual(yield* RcMap.keys(map), ["foo", "bar", "baz"])
    }))
})
