import { assert, describe, it } from "@effect/vitest"
import { Stream } from "effect"
import { Subscription } from "effect/ui"

describe("Subscription", () => {
  it("a Subscription without deps is keyed by its name", () => {
    assert.strictEqual(Subscription.make("tick", Stream.empty).key, "tick")
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

  it("the builder only sees its deps", () => {
    let seen: unknown
    Subscription.make("room", ["a", 1], (deps) => {
      seen = deps
      return Stream.empty
    })
    assert.deepStrictEqual(seen, ["a", 1])
  })
})
