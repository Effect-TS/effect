import type * as AV from "./AssertionValue/AssertionValue"
import type * as BAM from "./BoolAlgebraM"

export interface AssertResultM
  extends BAM.BoolAlgebraM<unknown, never, AV.AssertionValue> {}

export * from "./BoolAlgebraM"
