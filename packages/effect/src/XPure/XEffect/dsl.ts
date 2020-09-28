import * as DSL from "../../Prelude/DSL"
import { Access, Applicative, Fail, Monad, Provide, Run } from "./instances"

export const struct = DSL.structF(Applicative)

export const getValidationApplicative = DSL.getValidationF({
  ...Applicative,
  ...Fail,
  ...Run,
  ...Monad
})

export const bind = DSL.bindF(Monad)

const do_ = DSL.doF(Monad)

export { do_ as do }

export const provideService = DSL.provideServiceF({ ...Monad, ...Provide, ...Access })

export const accessService = DSL.accessServiceMF({ ...Monad, ...Access })
