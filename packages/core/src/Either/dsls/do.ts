// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Monad } from "../instances.js"

const { bind, do: do_, let: let_ } = DSL.getDo(Monad)

export { do_ as do, let_ as let, bind }
