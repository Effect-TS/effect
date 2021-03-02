import { sequenceF } from "../Prelude"
import * as DSL from "../Prelude/DSL"
import { Applicative, Covariant, Fail, ForEach, Monad, Run } from "./instances"

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Fail,
  ...Applicative,
  ...Run
})

export const struct = DSL.structF(Applicative)

export const sequence = sequenceF(ForEach)

export const tuple = DSL.tupleF(Applicative)

const do_ = DSL.doF(Monad)()

export const bind = DSL.bindF(Monad)

const let_ = DSL.bindF(Monad)

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
