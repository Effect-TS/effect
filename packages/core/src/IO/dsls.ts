import * as A from "../Array"
import * as DSL from "../Prelude/DSL"
import { Applicative, Covariant, Monad } from "./instances"

/**
 * Struct based applicative for IO[+_]
 */
export const struct = DSL.structF(Applicative)

/**
 * Tuple based applicative for IO[+_]
 */
export const tuple = DSL.tupleF(Applicative)

/**
 * Initialize Do
 */
export const do_ = DSL.doF(Monad)

/**
 * Bind variable in scope
 */
export const bind = DSL.bindF(Monad)

/**
 * Bind variable in scope
 */
const let_ = DSL.letF(Monad)

export { let_ as let, do_ as do }

/**
 * Matchers
 */
export const { match, matchIn, matchMorph, matchTag, matchTagIn } = DSL.matchers(
  Covariant
)

/**
 * Conditionals
 */
const branch = DSL.conditionalF(Covariant)
const branch_ = DSL.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }

/**
 * Foreach
 */
export const forEachArray = A.forEachF(Applicative)
export const forEachWithIndexArray = A.forEachWithIndexF(Applicative)
