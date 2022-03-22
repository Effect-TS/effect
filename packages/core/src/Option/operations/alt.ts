// ets_tracing: off

import * as P from "../../PreludeV2/index.js"
import { AssociativeEither } from "../instances/AssociativeEither.js"
import { Covariant } from "../instances/Covariant.js"

export const alt = P.orElseF(Covariant, AssociativeEither)
