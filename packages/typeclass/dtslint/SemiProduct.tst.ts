import { SemiProduct } from "@effect/typeclass"
import type { Option } from "effect"
import { describe, it } from "tstyche"

declare const SemiProductInstance: SemiProduct.SemiProduct<Option.OptionTypeLambda>

describe("SemiProduct", () => {
  it("nonEmptyTuple", () => {
    // should not allow empty tuples
    // @ts-expect-error: Expected at least 1 arguments, but got 0
    SemiProduct.nonEmptyTuple(SemiProductInstance)()

    // should not allow empty structs
    SemiProduct.nonEmptyStruct(SemiProductInstance)(
      // @ts-expect-error: Argument of type '{}' is not assignable to parameter of type 'never'
      {}
    )
  })
})
