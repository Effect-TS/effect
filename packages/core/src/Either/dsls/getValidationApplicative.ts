// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Applicative, Fail, Monad, Run } from "../instances.js"

export const getValidationApplicative = DSL.getValidationF({
  ...Monad,
  ...Fail,
  ...Applicative,
  ...Run
})
