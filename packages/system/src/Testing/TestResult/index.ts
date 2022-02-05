// ets_tracing: off

import type * as BA from "../BoolAlgebra/index.js"
import type * as FD from "../FailureDetails/index.js"

export type TestResult = BA.BoolAlgebra<FD.FailureDetails>
