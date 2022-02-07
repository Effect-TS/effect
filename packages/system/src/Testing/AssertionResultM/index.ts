// ets_tracing: off

import type * as AV from "../AssertionValue/AssertionValue.js"
import type * as BAM from "../BoolAlgebraM/index.js"

export interface AssertResultM
  extends BAM.BoolAlgebraM<unknown, never, AV.AssertionValue> {}
