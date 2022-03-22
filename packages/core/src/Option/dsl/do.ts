// ets_tracing: off

import * as P from "../../PreludeV2/index.js"
import { Monad } from "../instances/Monad.js"

const { bind, do: do_, let: let_ } = P.getDo(Monad)

export { do_ as do, let_ as let, bind }
