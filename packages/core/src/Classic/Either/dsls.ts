import { sequenceF } from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import { Applicative, Fail, Monad, Run, Traversable } from "./instances"

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
