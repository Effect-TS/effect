// ets_tracing: off

import * as P from "../../Prelude"
import { Monad } from "../instances/Monad"

export const do_ = P.doF(Monad)
export const let_ = P.letF(Monad)

export { do_ as do, let_ as let }

export const bind = P.bindF(Monad)
