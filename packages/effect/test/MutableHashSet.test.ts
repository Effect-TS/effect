import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Equal, Hash, MutableHashSet } from "effect"

class Value implements Equal.Equal {
  constructor(readonly a: number, readonly b: number) {}

  [Hash.symbol]() {
    return Hash.hash(`${this.a}-${this.b}`)
  }

  [Equal.symbol](that: unknown): boolean {
    return that instanceof Value && this.a === that.a && this.b === that.b
  }

  toJSON() {
    return { _id: "Value", a: this.a, b: this.b }
  }
}

describe("MutableHashSet", () => {
  it("toString", () => {
    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    strictEqual(
      String(set),
      `{
  "_id": "MutableHashSet",
  "values": [
    {
      "_id": "Value",
      "a": 0,
      "b": 1
    },
    {
      "_id": "Value",
      "a": 2,
      "b": 3
    }
  ]
}`
    )
  })

  it("toJSON", () => {
    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    deepStrictEqual(set.toJSON(), {
      _id: "MutableHashSet",
      values: [{ _id: "Value", a: 0, b: 1 }, { _id: "Value", a: 2, b: 3 }]
    })
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { inspect } = require("node:util")

    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    deepStrictEqual(
      inspect(set),
      inspect({ _id: "MutableHashSet", values: [{ _id: "Value", a: 0, b: 1 }, { _id: "Value", a: 2, b: 3 }] })
    )
  })
})
