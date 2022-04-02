// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Applicative } from "../instances/Applicative.js"
import { Monad } from "../instances/Monad.js"

export const tuple = DSL.tupleF({ ...Monad, ...Applicative })
