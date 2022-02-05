// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { Applicative } from "../instances/Applicative.js"
import { Monad } from "../instances/Monad.js"

export const tuple = P.tupleF({ ...Monad, ...Applicative })
