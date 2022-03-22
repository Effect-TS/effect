// ets_tracing: off

import type { OptionF } from "@effect-ts/core/Option/definitions"

import * as P from "../../PreludeV2/index.js"

/**
 * Conditionals
 */

const branch = P.conditionalF<OptionF>()
const branch_ = P.conditionalF_<OptionF>()

export { branch as if, branch_ as if_ }
