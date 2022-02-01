// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Covariant } from "../instances.js"

/**
 * Conditionals
 */
const branch = DSL.conditionalF(Covariant)
const branch_ = DSL.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
