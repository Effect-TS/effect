// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Applicative } from "../instances/Applicative.js"
import { Monad } from "../instances/Monad.js"

export const struct = DSL.structF({ ...Monad, ...Applicative })
