import { addEqualityTesters, expect, it } from "@effect/rstest"
import { Equal, Hash } from "effect"

class SemanticValue implements Equal.Equal {
  readonly #key: string

  readonly representation: string

  constructor(key: string, representation: string) {
    this.#key = key
    this.representation = representation
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    return #key in that && this.#key === that.#key
  }

  [Hash.symbol](): number {
    // Deliberate collision: unequal values must reach the equality method.
    return this.#key.length
  }
}

addEqualityTesters()

it("uses semantic equality despite different enumerable representations", () => {
  const left = new SemanticValue("same", "left")
  const right = new SemanticValue("same", "right")
  expect(left.representation).not.toBe(right.representation)
  expect(Equal.equals(left, right)).toBe(true)
  expect(left).toEqual(right)
  expect({ value: left }).toEqual({ value: right })
})

it("respects semantic inequality despite identical enumerable representations", () => {
  const left = new SemanticValue("left", "same")
  const right = new SemanticValue("next", "same")
  expect(left.representation).toBe(right.representation)
  expect(Equal.equals(left, right)).toBe(false)
  expect(left).not.toEqual(right)
  expect({ value: left }).not.toEqual({ value: right })
})

it("preserves native plain-object deep equality and asymmetric matchers", () => {
  expect({ nested: { value: 1 } }).toEqual({ nested: { value: 1 } })
  expect({ nested: { value: 1 } }).not.toEqual({ nested: { value: 2 } })
  expect({ nested: { value: 1 } }).toEqual({ nested: { value: expect.any(Number) } })
})
