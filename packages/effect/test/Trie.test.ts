import { deepStrictEqual } from "effect-test/util"
import { pipe } from "effect/Function"
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

  it("Immutable", () => {
    const trie1 = pipe(
      Trie.empty<number>(),
      Trie.insert("call", 0)
    )

    const trie2 = trie1.pipe(Trie.insert("me", 1))
    const trie3 = trie2.pipe(Trie.insert("mind", 2))
    const trie4 = trie3.pipe(Trie.insert("mid", 3))

    expect(Array.from(trie1).length).toBe(1)
    expect(Array.from(trie2).length).toBe(2)
    expect(Array.from(trie3).length).toBe(3)
    expect(Array.from(trie4).length).toBe(4)
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
    expect(Trie.size(trie)).toBe(2)
  })
})
