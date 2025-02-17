import type { SemiProduct } from "@effect/typeclass"
import type { Option } from "effect"
import { describe, it } from "tstyche"

declare const SemiProductInstance: SemiProduct.SemiProduct<Option.OptionTypeLambda>

describe("SemiProduct", () => {
  it("nonEmptyTuple", () => {
    // @ts-expect-error
    _.nonEmptyTuple(SemiProductInstance)() // should not allow empty tuples

    // @ts-expect-error
    _.nonEmptyStruct(SemiProductInstance)({}) // should not allow empty structs
  })
})
