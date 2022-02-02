// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { Monad } from "../instances.js"

const do_ = DSL.doF(Monad)
const let_ = DSL.bindF(Monad)

export { do_ as do, let_ as let }

export const bind = DSL.bindF(Monad)
