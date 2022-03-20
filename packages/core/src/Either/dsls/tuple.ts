// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import { Applicative } from "../instances.js"

export const tuple = DSL.tupleF(Applicative)
