// ets_tracing: off

import * as P from "../../Prelude"
import { Applicative } from "../instances/Applicative"
import { Monad } from "../instances/Monad"

export const tuple = P.tupleF({ ...Monad, ...Applicative })
