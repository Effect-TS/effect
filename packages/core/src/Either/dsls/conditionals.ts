// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { EitherF } from "../instances.js"

/**
 * Conditionals
 */
const branch = DSL.conditionalF<EitherF>()
const branch_ = DSL.conditionalF_<EitherF>()

export { branch as if, branch_ as if_ }
