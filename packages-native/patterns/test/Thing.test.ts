import * as Thing from "@effect-native/patterns/Thing"
import { assert, describe, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as HashSet from "effect/HashSet"

describe("Thing", () => {
  it("make creates TypeId-tagged instances and isThing recognizes them", () => {
    const original = Thing.make({ id: "alpha", label: "demo", value: 1 })

    assert.isTrue(Thing.isThing(original))
    assert.strictEqual(original.id, "alpha")
    assert.strictEqual(original.label, "demo")
    assert.strictEqual(original.value, 1)
    assert.deepStrictEqual(original.tags, [])
  })

  it("instances obey Equal and Hash protocols", () => {
    const left = Thing.make({ id: "alpha", label: "demo", value: Data.struct({ count: 1 }) })
    const right = Thing.make({ id: "alpha", label: "demo", value: Data.struct({ count: 1 }) })

    assert.isTrue(Equal.equals(left, right))
    assert.strictEqual(Hash.hash(left), Hash.hash(right))

    const set = HashSet.empty<typeof left>()
      .pipe(
        HashSet.add(left),
        HashSet.add(right)
      )

    assert.strictEqual(HashSet.size(set), 1)
  })

  it("mapValue supports data-last and data-first usage via dual", () => {
    const source = Thing.make({ id: "alpha", label: "demo", value: 2 })

    const doubled = Thing.mapValue(source, (value) => value * 2)
    const tripled = Thing.mapValue((value: number) => value * 3)(source)

    assert.strictEqual(doubled.value, 4)
    assert.strictEqual(tripled.value, 6)
    assert.deepStrictEqual(doubled.tags, [])
  })

  it("addTag deduplicates and keeps tags sorted for stable hashing", () => {
    const source = Thing.make({
      id: "alpha",
      label: "demo",
      value: 1,
      tags: ["examples", "patterns"]
    })

    const updated = source.pipe(
      Thing.addTag("patterns"),
      Thing.addTag("uxp"),
      Thing.addTag("dual")
    )

    assert.deepStrictEqual(updated.tags, ["dual", "examples", "patterns", "uxp"])
  })
})
