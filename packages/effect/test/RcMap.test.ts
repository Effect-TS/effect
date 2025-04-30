import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Data, Effect, Exit, RcMap, Scope, TestClock } from "effect"

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

      deepStrictEqual(acquired, [])
      strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      deepStrictEqual(acquired, ["foo"])
      deepStrictEqual(released, ["foo"])

      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      yield* RcMap.get(map, "bar").pipe(Scope.extend(scopeA))
      yield* Effect.scoped(RcMap.get(map, "bar"))
      yield* RcMap.get(map, "baz").pipe(Scope.extend(scopeB))
      yield* Effect.scoped(RcMap.get(map, "baz"))
      deepStrictEqual(acquired, ["foo", "bar", "baz"])
      deepStrictEqual(released, ["foo"])
      yield* Scope.close(scopeB, Exit.void)
      deepStrictEqual(acquired, ["foo", "bar", "baz"])
      deepStrictEqual(released, ["foo", "baz"])
      yield* Scope.close(scopeA, Exit.void)
      deepStrictEqual(acquired, ["foo", "bar", "baz"])
      deepStrictEqual(released, ["foo", "baz", "bar"])

      const scopeC = yield* Scope.make()
      yield* RcMap.get(map, "qux").pipe(Scope.extend(scopeC))
      deepStrictEqual(acquired, ["foo", "bar", "baz", "qux"])
      deepStrictEqual(released, ["foo", "baz", "bar"])

      yield* Scope.close(mapScope, Exit.void)
      deepStrictEqual(acquired, ["foo", "bar", "baz", "qux"])
      deepStrictEqual(released, ["foo", "baz", "bar", "qux"])

      const exit = yield* RcMap.get(map, "boom").pipe(Effect.scoped, Effect.exit)
      assertTrue(Exit.isInterrupted(exit))
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

      deepStrictEqual(acquired, [])
      strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      deepStrictEqual(acquired, ["foo"])
      deepStrictEqual(released, [])

      yield* TestClock.adjust(1000)
      deepStrictEqual(released, ["foo"])

      strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")
      deepStrictEqual(acquired, ["foo", "bar"])
      deepStrictEqual(released, ["foo"])

      yield* TestClock.adjust(500)
      strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")
      deepStrictEqual(acquired, ["foo", "bar"])
      deepStrictEqual(released, ["foo"])

      yield* TestClock.adjust(1000)
      deepStrictEqual(released, ["foo", "bar"])

      yield* Effect.scoped(RcMap.get(map, "baz"))
      deepStrictEqual(acquired, ["foo", "bar", "baz"])
      yield* RcMap.invalidate(map, "baz")
      deepStrictEqual(acquired, ["foo", "bar", "baz"])
      deepStrictEqual(released, ["foo", "bar", "baz"])
    }))

  it.scoped(".touch", () =>
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

      deepStrictEqual(acquired, [])
      strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      deepStrictEqual(acquired, ["foo"])
      deepStrictEqual(released, [])

      yield* TestClock.adjust(500)
      deepStrictEqual(released, [])

      yield* RcMap.touch(map, "foo")
      yield* TestClock.adjust(500)
      deepStrictEqual(released, [])
      yield* TestClock.adjust(500)
      deepStrictEqual(released, ["foo"])
    }))

  it.scoped("capacity", () =>
    Effect.gen(function*() {
      const map = yield* RcMap.make({
        lookup: (key: string) => Effect.succeed(key),
        capacity: 2,
        idleTimeToLive: 1000
      })

      strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      strictEqual(yield* Effect.scoped(RcMap.get(map, "foo")), "foo")
      strictEqual(yield* Effect.scoped(RcMap.get(map, "bar")), "bar")

      const exit = yield* RcMap.get(map, "baz").pipe(Effect.scoped, Effect.exit)
      deepStrictEqual(
        exit,
        Exit.fail(new Cause.ExceededCapacityException(`RcMap attempted to exceed capacity of 2`))
      )

      yield* TestClock.adjust(1000)
      strictEqual(yield* Effect.scoped(RcMap.get(map, "baz")), "baz")
    }))

  it.scoped("complex key", () =>
    Effect.gen(function*() {
      class Key extends Data.Class<{ readonly id: number }> {}
      const map = yield* RcMap.make({
        lookup: (key: Key) => Effect.succeed(key.id),
        capacity: 1
      })

      strictEqual(yield* RcMap.get(map, new Key({ id: 1 })), 1)
      // no failure means a hit
      strictEqual(yield* RcMap.get(map, new Key({ id: 1 })), 1)
    }))

  it.scoped("keys lookup", () =>
    Effect.gen(function*() {
      const map = yield* RcMap.make({
        lookup: (key: string) => Effect.succeed(key)
      })

      yield* RcMap.get(map, "foo")
      yield* RcMap.get(map, "bar")
      yield* RcMap.get(map, "baz")

      deepStrictEqual(yield* RcMap.keys(map), ["foo", "bar", "baz"])
    }))
})
