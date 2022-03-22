// ets_tracing: off

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
  P.matchers<DictionaryF>()

/**
 * Conditionals
 */
const branch = P.conditionalF<DictionaryF>()
const branch_ = P.conditionalF_<DictionaryF>()

export { branch as if, branch_ as if_ }
