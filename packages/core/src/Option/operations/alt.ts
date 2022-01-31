// ets_tracing: off

import * as P from "../../Prelude/index.js"
import { AssociativeEither } from "../instances/AssociativeEither.js"
import { Covariant } from "../instances/Covariant.js"

export const alt = P.orElseF({ ...Covariant, ...AssociativeEither })
