// ets_tracing: off

import * as DSL from "../../Prelude/DSL"
import { Covariant } from "../instances"

/**
 * Conditionals
 */
const branch = DSL.conditionalF(Covariant)
const branch_ = DSL.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
