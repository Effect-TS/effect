import * as DSL from "../../Prelude/DSL"
import { Applicative, Covariant, Fail, Monad, Run } from "./instances"

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
