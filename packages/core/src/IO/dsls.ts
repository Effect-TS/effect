import * as A from "../Array"
import * as P from "../Prelude"
import { Applicative, Covariant } from "./instances"

/**
 * Struct based applicative for IO[+_]
 */
export const struct = P.structF(Applicative)

/**
 * Tuple based applicative for IO[+_]
 */
export const tuple = P.tupleF(Applicative)

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = P.matchers(
  Covariant
)

/**
 * Conditionals
 */
const branch = P.conditionalF(Covariant)
const branch_ = P.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }

/**
 * Foreach
 */
export const forEachArray = A.forEachF(Applicative)
export const forEachWithIndexArray = A.forEachWithIndexF(Applicative)
