import { deepStrictEqual } from "effect-test/util"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Trie from "effect/Trie"
import { assert, describe, expect, it } from "vitest"

describe("Trie", () => {
  it("toString", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("a", 0),
      Trie.insert("b", 1)
    )

    expect(String(trie)).toEqual(`{
  "_id": "Trie",
  "values": [
    [
      "a",
      0
    ],
    [
      "b",
      1
    ]
  ]
}`)
  })

  it("toJSON", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("a", 0),
      Trie.insert("b", 1)
    )

    expect(trie.toJSON()).toEqual(
      { _id: "Trie", values: [["a", 0], ["b", 1]] }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { inspect } = require("node:util")

    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("a", 0),
      Trie.insert("b", 1)
    )

    expect(inspect(trie)).toEqual(inspect({ _id: "Trie", values: [["a", 0], ["b", 1]] }))
  })

  it("iterable empty", () => {
    const trie = pipe(Trie.empty<string>())

    assert.strictEqual(Trie.size(trie), 0)
    deepStrictEqual(Array.from(trie), [])
  })

  it("insert", () => {
    const trie1 = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0)
    )

    const trie2 = trie1.pipe(Trie.insert("me", 1))
    const trie3 = trie2.pipe(Trie.insert("mind", 2))
    const trie4 = trie3.pipe(Trie.insert("mid", 3))

    deepStrictEqual(Array.from(trie1), [["call", 0]])
    deepStrictEqual(Array.from(trie2), [["call", 0], ["me", 1]])
    deepStrictEqual(Array.from(trie3), [["call", 0], ["me", 1], ["mind", 2]])
    deepStrictEqual(Array.from(trie4), [["call", 0], ["me", 1], ["mind", 2], ["mid", 3]])
  })

  it("fromIterable empty", () => {
    const iterable: Array<[string, number]> = []
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), iterable)
  })

  it("fromIterable [1]", () => {
    const iterable: Array<[string, number]> = [["ca", 0], ["me", 1]]
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), iterable)
  })

  it("fromIterable [2]", () => {
    const iterable: Array<[string, number]> = [["call", 0], ["me", 1], ["mind", 2], ["mid", 3]]
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), iterable)
  })

  it("fromIterable [3]", () => {
    const iterable: Array<[string, number]> = [["a", 0], ["b", 1]]
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), iterable)
  })

  it("fromIterable [4]", () => {
    const iterable: Array<[string, number]> = [["a", 0]]
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), iterable)
  })

  it("fromIterable [5]", () => {
    const iterable: Array<[string, number]> = [["shells", 0], ["she", 1]]
    const trie = Trie.fromIterable(iterable)
    deepStrictEqual(Array.from(trie), [["she", 1], ["shells", 0]])
  })

  it("size", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("a", 0),
      Trie.insert("b", 1)
    )
    assert.equal(Trie.size(trie), 2)
  })

  it("isEmpty", () => {
    const trie = pipe(
      Trie.empty<number>()
    )
    const trie1 = trie.pipe(Trie.insert("ma", 0))
    assert.equal(Trie.isEmpty(trie), true)
    assert.equal(Trie.isEmpty(trie1), false)
  })

  it("get", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1),
      Trie.insert("mind", 2),
      Trie.insert("mid", 3)
    )
    deepStrictEqual(Trie.get(trie, "call"), Option.some(0))
    deepStrictEqual(Trie.get(trie, "me"), Option.some(1))
    deepStrictEqual(Trie.get(trie, "mind"), Option.some(2))
    deepStrictEqual(Trie.get(trie, "mid"), Option.some(3))
    deepStrictEqual(Trie.get(trie, "cale"), Option.none())
    deepStrictEqual(Trie.get(trie, "ma"), Option.none())
    deepStrictEqual(Trie.get(trie, "midn"), Option.none())
    deepStrictEqual(Trie.get(trie, "mea"), Option.none())
  })

  it("has", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1),
      Trie.insert("mind", 2),
      Trie.insert("mid", 3)
    )
    assert.equal(Trie.has(trie, "call"), true)
    assert.equal(Trie.has(trie, "me"), true)
    assert.equal(Trie.has(trie, "mind"), true)
    assert.equal(Trie.has(trie, "mid"), true)
    assert.equal(Trie.has(trie, "cale"), false)
    assert.equal(Trie.has(trie, "ma"), false)
    assert.equal(Trie.has(trie, "midn"), false)
    assert.equal(Trie.has(trie, "mea"), false)
  })

  it("unsafeGet", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1)
    )

    assert.throws(() => Trie.unsafeGet(trie, "mae"))
  })

  it("remove", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1),
      Trie.insert("mind", 2),
      Trie.insert("mid", 3)
    )

    const trie1 = trie.pipe(Trie.remove("call"))
    const trie2 = trie1.pipe(Trie.remove("mea"))

    deepStrictEqual(Trie.get(trie, "call"), Option.some(0))
    deepStrictEqual(Trie.get(trie1, "call"), Option.none())
    deepStrictEqual(Trie.get(trie2, "call"), Option.none())

    deepStrictEqual(Array.from(trie), [["call", 0], ["me", 1], ["mind", 2], ["mid", 3]])
    deepStrictEqual(Array.from(trie1), [["me", 1], ["mind", 2], ["mid", 3]])
    deepStrictEqual(Array.from(trie2), [["me", 1], ["mind", 2], ["mid", 3]])
  })

  it("keys", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1)
    )

    const result = Array.from(Trie.keys(trie))
    deepStrictEqual(result, ["call", "me"])
  })

  it("values", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1)
    )

    const result = Array.from(Trie.values(trie))
    deepStrictEqual(result, [0, 1])
  })

  it("entries", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1)
    )

    const result = Array.from(Trie.entries(trie))
    deepStrictEqual(result, [["call", 0], ["me", 1]])
  })

  it("toEntries", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0),
      Trie.insert("me", 1)
    )

    const result = Trie.toEntries(trie)
    deepStrictEqual(result, [["call", 0], ["me", 1]])
  })

  it("keysWithPrefix", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("sea", 2),
      Trie.insert("she", 3)
    )

    const result = Array.from(Trie.keysWithPrefix(trie, "she"))
    deepStrictEqual(result, ["she", "shells"])
  })

  it("valuesWithPrefix", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("sea", 2),
      Trie.insert("she", 3)
    )

    const result = Array.from(Trie.valuesWithPrefix(trie, "she"))
    deepStrictEqual(result, [3, 0])
  })

  it("entriesWithPrefix", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("sea", 2),
      Trie.insert("she", 3)
    )

    const result = Array.from(Trie.entriesWithPrefix(trie, "she"))
    deepStrictEqual(result, [["she", 3], ["shells", 0]])
  })

  it("toEntriesWithPrefix", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("sea", 2),
      Trie.insert("she", 3)
    )

    const result = Trie.toEntriesWithPrefix(trie, "she")
    deepStrictEqual(result, [["she", 3], ["shells", 0]])
  })

  it("longestPrefixOf", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    deepStrictEqual(Trie.longestPrefixOf(trie, "sell"), Option.none())
    deepStrictEqual(Trie.longestPrefixOf(trie, "sells"), Option.some(["sells", 1]))
    deepStrictEqual(Trie.longestPrefixOf(trie, "shell"), Option.some(["she", 2]))
    deepStrictEqual(Trie.longestPrefixOf(trie, "shellsort"), Option.some(["shells", 0]))
  })

  it("map", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    const trieMapV = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 1),
      Trie.insert("sells", 2),
      Trie.insert("she", 3)
    )

    const trieMapK = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 6),
      Trie.insert("sells", 5),
      Trie.insert("she", 3)
    )

    assert.equal(Equal.equals(Trie.map(trie, (v) => v + 1), trieMapV), true)
    assert.equal(Equal.equals(Trie.map(trie, (_, k) => k.length), trieMapK), true)
  })

  it("filter", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    const trieMapV = pipe(
      Trie.empty<number>(),
      Trie.insert("she", 2)
    )

    const trieMapK = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1)
    )

    assert.equal(Equal.equals(Trie.filter(trie, (v) => v > 1), trieMapV), true)
    assert.equal(Equal.equals(Trie.filter(trie, (_, k) => k.length > 3), trieMapK), true)
  })

  it("filterMap", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    const trieMapV = pipe(
      Trie.empty<number>(),
      Trie.insert("she", 2)
    )

    const trieMapK = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1)
    )

    assert.equal(Equal.equals(Trie.filterMap(trie, (v) => v > 1 ? Option.some(v) : Option.none()), trieMapV), true)
    assert.equal(
      Equal.equals(Trie.filterMap(trie, (v, k) => k.length > 3 ? Option.some(v) : Option.none()), trieMapK),
      true
    )
  })

  it("compact", () => {
    const trie = pipe(
      Trie.empty<Option.Option<number>>(),
      Trie.insert("shells", Option.some(0)),
      Trie.insert("sells", Option.none()),
      Trie.insert("she", Option.some(2))
    )

    const trieMapV = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("she", 2)
    )

    assert.equal(Equal.equals(Trie.compact(trie), trieMapV), true)
  })

  it("modify", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    deepStrictEqual(trie.pipe(Trie.modify("she", (v) => v + 10), Trie.get("she")), Option.some(12))
    assert.equal(Equal.equals(trie.pipe(Trie.modify("me", (v) => v)), trie), true)
  })

  it("removeMany", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    assert.equal(
      Equal.equals(trie.pipe(Trie.removeMany(["she", "sells"])), Trie.empty<number>().pipe(Trie.insert("shells", 0))),
      true
    )
  })

  it("insertMany", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    const trieInsert = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insertMany(
        [["sells", 1], ["she", 2]]
      )
    )

    assert.equal(
      Equal.equals(trie, trieInsert),
      true
    )
  })

  it("reduce", () => {
    const trie = pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2)
    )

    assert.equal(
      trie.pipe(
        Trie.reduce(0, (acc, n) => acc + n)
      ),
      3
    )
    assert.equal(
      trie.pipe(
        Trie.reduce(10, (acc, n) => acc + n)
      ),
      13
    )
    assert.equal(
      trie.pipe(
        Trie.reduce("", (acc, _, key) => acc + key)
      ),
      "sheshellssells"
    )
  })

  it("forEach", () => {
    let value = 0
    pipe(
      Trie.empty<number>(),
      Trie.insert("shells", 0),
      Trie.insert("sells", 1),
      Trie.insert("she", 2),
      Trie.forEach((n, key) => {
        value += n + key.length
      })
    )

    assert.equal(value, 17)
  })

  it("Equal.symbol", () => {
    assert.equal(
      Equal.equals(Trie.empty<number>(), Trie.empty<number>()),
      true
    )
    assert.equal(
      Equal.equals(
        Trie.make(["call", 0], ["me", 1]),
        Trie.make(["call", 0], ["me", 1])
      ),
      true
    )
  })
})
