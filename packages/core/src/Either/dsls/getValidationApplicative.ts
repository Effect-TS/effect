// ets_tracing: off

import * as DSL from "../../Prelude/DSL"
import { Applicative, Fail, Monad, Run } from "../instances"

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Fail,
  ...Applicative,
  ...Run
})
