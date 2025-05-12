import { SemiProduct } from "@effect/typeclass"
import type { Option } from "effect"
import { describe, expect, it } from "tstyche"

declare const SemiProductInstance: SemiProduct.SemiProduct<Option.OptionTypeLambda>

describe("SemiProduct", () => {
  it("nonEmptyTuple", () => {
    // should not allow empty tuples
    expect(SemiProduct.nonEmptyTuple(SemiProductInstance)).type.not.toBeCallableWith()

    // should not allow empty structs
    expect(SemiProduct.nonEmptyStruct(SemiProductInstance)).type.not.toBeCallableWith({})
  })
})
