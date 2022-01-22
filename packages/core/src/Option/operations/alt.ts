// ets_tracing: off

import * as DSL from "../../PreludeV2/DSL/index.js"
import { AssociativeEither } from "../instances/AssociativeEither.js"
import { Covariant } from "../instances/Covariant.js"

export const alt = DSL.orElseF({ ...Covariant, ...AssociativeEither })
