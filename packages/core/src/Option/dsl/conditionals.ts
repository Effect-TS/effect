// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { Covariant } from "../instances/Covariant.js"

/**
 * Conditionals
 */

const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
