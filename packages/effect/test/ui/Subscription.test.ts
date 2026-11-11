import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { Subscription } from "effect/ui"

describe("Subscription", () => {
  it("a Subscription without deps is keyed by its name", () => {
    assert.strictEqual(Subscription.make("tick", Stream.empty).key, "tick")
  })

  it("a name can't pass for a name with deps", () => {
    assert.strictEqual(Subscription.make("page:null", Stream.empty).key, "page::null")
    assert.strictEqual(Subscription.make("page", null, () => Stream.empty).key, "page:null")
    assert.strictEqual(Subscription.make("a:b", "c", () => Stream.empty).key, "a::b:\"c\"")
  })

  it("numbers JSON can't tell apart keep distinct keys", () => {
    const key = (dep: Subscription.Dep) => Subscription.make("page", dep, () => Stream.empty).key
    const keys = [key(NaN), key(Infinity), key(-Infinity), key(null), key(0), key(-0), key("null")]
    assert.strictEqual(new Set(keys).size, keys.length)
    assert.strictEqual(key(NaN), "page:NaN")
    assert.strictEqual(key(-0), "page:-0")
    assert.strictEqual(key(0), "page:0")
  })

  it("deps join the key without colliding", () => {
    const key = (deps: Subscription.Deps) => Subscription.make("room", deps, () => Stream.empty).key
    assert.strictEqual(key("42"), "room:\"42\"")
    assert.strictEqual(key(42), "room:42")
    assert.notStrictEqual(key("1"), key(1))
    assert.notStrictEqual(key(["a,b", "c"]), key(["a", "b,c"]))
    assert.notStrictEqual(key([true, null]), key(["true", "null"]))
    assert.strictEqual(key([1, "x"]), Subscription.keyOf("room", [1, "x"]))
  })

  it.effect("builds lazily with only its deps each time the Stream runs", () =>
    Effect.gen(function*() {
      const seen: Array<unknown> = []
      const subscription = Subscription.make("room", ["a", 1], (deps) => {
        seen.push(deps)
        return Stream.empty
      })
      assert.deepStrictEqual(seen, [])
      yield* Stream.runDrain(subscription.stream)
      yield* Stream.runDrain(subscription.stream)
      assert.deepStrictEqual(seen, [["a", 1], ["a", 1]])
    }))
})
