// ets_tracing: off

import * as DSL from "../../Prelude/DSL"
import { Applicative } from "../instances"

export const tuple = DSL.tupleF(Applicative)
