// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Monad } from "../instances/Monad.js"

export const gen = DSL.genF(Monad)
