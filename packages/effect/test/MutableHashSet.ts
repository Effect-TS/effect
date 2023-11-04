import * as Equal from "effect/Equal"
import * as Hash from "effect/Hash"
import * as MutableHashSet from "effect/MutableHashSet"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

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

describe.concurrent("MutableHashSet", () => {
  it("toString", () => {
    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    expect(String(set)).toEqual(`{
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
}`)
  })

  it("toJSON", () => {
    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    expect(set.toJSON()).toEqual(
      { _id: "MutableHashSet", values: [{ _id: "Value", a: 0, b: 1 }, { _id: "Value", a: 2, b: 3 }] }
    )
  })

  it("inspect", () => {
    if (typeof window !== "undefined") {
      return
    }
    const set = MutableHashSet.make(
      new Value(0, 1),
      new Value(2, 3)
    )

    expect(inspect(set)).toEqual(
      inspect({ _id: "MutableHashSet", values: [{ _id: "Value", a: 0, b: 1 }, { _id: "Value", a: 2, b: 3 }] })
    )
  })
})
