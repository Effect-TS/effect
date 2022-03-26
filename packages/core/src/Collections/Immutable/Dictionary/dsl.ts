// ets_tracing: off

import * as DSL from "../../../PreludeV2/DSL/index.js"
import * as P from "../../../PreludeV2/index.js"
import type { DictionaryF } from "./instances.js"
import { ForEach } from "./instances.js"

/**
 * Like traverse(identity)
 */

export const sequence = P.sequenceF(ForEach)
/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } =
  DSL.matchers<DictionaryF>()

/**
 * Conditionals
 */
const branch = DSL.conditionalF<DictionaryF>()
const branch_ = DSL.conditionalF_<DictionaryF>()

export { branch as if, branch_ as if_ }
