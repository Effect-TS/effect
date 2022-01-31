import type * as AV from "../AssertionValue/AssertionValue"
import type * as BAM from "../BoolAlgebraM/index.js"

export interface AssertResultM
  extends BAM.BoolAlgebraM<unknown, never, AV.AssertionValue> {}
