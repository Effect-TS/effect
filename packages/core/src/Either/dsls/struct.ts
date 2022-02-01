// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Applicative } from "../instances.js"

export const struct = DSL.structF(Applicative)
