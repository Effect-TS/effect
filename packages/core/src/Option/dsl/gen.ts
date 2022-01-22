// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Monad } from "../instances/Monad.js"

export const gen = DSL.genF(Monad)
