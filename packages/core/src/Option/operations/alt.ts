// ets_tracing: off

import * as DSL from "../../Prelude/DSL/index.js"
import { AssociativeEither } from "../instances/AssociativeEither.js"
import { Covariant } from "../instances/Covariant.js"

export const alt = DSL.orElseF({ ...Covariant, ...AssociativeEither })
