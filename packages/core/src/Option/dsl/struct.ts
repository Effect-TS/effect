// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { Applicative } from "../instances/Applicative.js"
import { Monad } from "../instances/Monad.js"

export const struct = P.structF({ ...Monad, ...Applicative })
