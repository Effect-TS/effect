import type * as AV from "./AssertionValue"
import type * as BA from "./BoolAlgebra"

export interface AssertResult extends BA.BoolAlgebra<AV.AssertionValue> {}

export * from "./BoolAlgebra"
