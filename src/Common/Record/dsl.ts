import * as P from "../../Prelude"
import { Traversable } from "./instances"

/**
 * Like traverse(identity)
 */

export const sequence = P.sequenceF(Traversable)
/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = P.matchers(Traversable)

/**
 * Conditionals
 */
const branch = P.conditionalF(Traversable)
const branch_ = P.conditionalF_(Traversable)

export { branch as if, branch_ as if_ }
