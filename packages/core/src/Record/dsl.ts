import * as P from "../Prelude"
import { ForEeach } from "./instances"

/**
 * Like traverse(identity)
 */

export const sequence = P.sequenceF(ForEeach)
/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(ForEeach)

/**
 * Conditionals
 */
const branch = P.conditionalF(ForEeach)
const branch_ = P.conditionalF_(ForEeach)

export { branch as if, branch_ as if_ }
