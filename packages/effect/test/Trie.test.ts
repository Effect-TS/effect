import { pipe } from "effect/Function"
import * as Trie from "effect/Trie"
import { describe, expect, it } from "vitest"

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

  it("Iterable", () => {
    const trie = pipe(
      Trie.empty<string>()
    )

    expect(Array.from(trie).length).toBe(0)
  })

  // it("Immutable", () => {
  //   const trie1 = pipe(
  //     Trie.empty<number>(),
  //     Trie.insert("a", 0)
  //   )

  //   const trie2 = trie1.pipe(Trie.insert("b", 1))

  //   expect(Array.from(trie1).length).toBe(1)
  //   expect(Array.from(trie2).length).toBe(2)
  // })

  it("fromIterable [empty]", () => {
    const iterable = [] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual(iterable)
  })

  it("fromIterable [1]", () => {
    const iterable = [["ca", 0], ["me", 1]] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual(iterable)
  })

  it("fromIterable [2]", () => {
    const iterable = [["call", 0], ["me", 1], ["mind", 2], ["mid", 3]] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual(iterable)
  })

  it("fromIterable [3]", () => {
    const iterable = [["a", 0], ["b", 1]] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual(iterable)
  })

  it("fromIterable [4]", () => {
    const iterable = [["a", 0]] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual(iterable)
  })

  it("fromIterable [5]", () => {
    const iterable = [["shells", 0], ["she", 1]] as const
    const trie = Trie.fromIterable(iterable)
    expect(Array.from(trie)).toStrictEqual([["she", 1], ["shells", 0]])
  })
})
