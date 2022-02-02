// ets_tracing: off

import * as P from "../../Prelude"
import { Covariant } from "../instances/Covariant"

/**
 * Conditionals
 */

const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
