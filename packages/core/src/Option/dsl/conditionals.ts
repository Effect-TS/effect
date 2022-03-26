// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"

import * as DSL from "../../PreludeV2/DSL/index.js"

/**
 * Conditionals
 */

const branch = DSL.conditionalF<OptionF>()
const branch_ = DSL.conditionalF_<OptionF>()

export { branch as if, branch_ as if_ }
