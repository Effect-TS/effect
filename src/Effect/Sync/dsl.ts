import * as DSL from "../../Prelude/DSL"
import { Applicative, Fail, Monad, Run } from "./instances"

export const struct = DSL.structF(Applicative)

export const getValidationApplicative = DSL.getValidationF({
  ...Applicative,
  ...Fail,
  ...Run,
  ...Monad
})
