import { addEqualityTesters, describe, expect, it } from "@effect/rstest"
import { Equal, Hash } from "effect"

class Id implements Equal.Equal {
  constructor(readonly id: string, readonly label: string) {}
  [Equal.symbol](that: Equal.Equal): boolean {
    return that instanceof Id && this.id === that.id
  }
  [Hash.symbol](): number {
    return Hash.string(this.id)
  }
}

addEqualityTesters()

describe("addEqualityTesters", () => {
  it("uses Effect equality", () => {
    expect(new Id("a", "left")).toEqual(new Id("a", "right"))
    expect({ value: new Id("a", "same") }).not.toEqual({ value: new Id("b", "same") })
  })

  it("keeps structural equality for plain values", () => {
    expect({ nested: { value: 1 } }).toEqual({ nested: { value: expect.any(Number) } })
    expect({ nested: { value: 1 } }).not.toEqual({ nested: { value: 2 } })
  })
})
