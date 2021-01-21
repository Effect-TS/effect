import { sequenceF } from "../Prelude"
import * as DSL from "../Prelude/DSL"
import { Applicative, Covariant, Fail, Monad, Run, Traversable } from "./instances"

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Fail,
  ...Applicative,
  ...Run
})

export const struct = DSL.structF(Applicative)

export const sequence = sequenceF(Traversable)

export const tuple = DSL.tupleF(Applicative)

export const gen_ = DSL.genF(Monad)

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
