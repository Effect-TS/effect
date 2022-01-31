// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Applicative } from "../instances"

export const tuple = DSL.tupleF(Applicative)
