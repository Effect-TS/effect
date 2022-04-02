// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import type { OptionF } from "../definitions.js"

/**
 * Conditionals
 */

const branch = DSL.conditionalF<OptionF>()
const branch_ = DSL.conditionalF_<OptionF>()

export { branch as if, branch_ as if_ }
