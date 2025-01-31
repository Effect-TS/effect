import * as ArrayInstances from "@effect/typeclass/data/Array"
import { describe, expect, it } from "@effect/vitest"

describe.concurrent("Array", () => {
  it("Product.productAll", () => {
    const productAll = ArrayInstances.Product.productAll
    expect(productAll([])).toEqual([])
    expect(productAll([[1, 2, 3]])).toEqual([[1], [2], [3]])
    expect(productAll([[1, 2, 3], [4, 5]])).toEqual([[1, 4], [1, 5], [2, 4], [2, 5], [3, 4], [
      3,
      5
    ]])
  })
})
