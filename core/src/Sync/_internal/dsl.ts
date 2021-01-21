import * as DSL from "../../Prelude/DSL"
import { Applicative, Covariant, Fail, Monad, Run } from "./instances"

export const tuple = DSL.tupleF(Applicative)
export const struct = DSL.structF(Applicative)

export const getValidationApplicative = DSL.getValidationF({
  ...Applicative,
  ...Fail,
  ...Run,
  ...Monad
})

/**
 * Matchers
 */
export const { match, matchIn, matchTag, matchTagIn } = DSL.matchers(Covariant)

/**
 * Conditionals
 */
const branch = DSL.conditionalF(Covariant)
const branch_ = DSL.conditionalF_(Covariant)

export { branch as if, branch_ as if_ }
