// ets_tracing: off

import * as P from "../../Prelude"
import { AssociativeEither } from "../instances/AssociativeEither"
import { Covariant } from "../instances/Covariant"

export const alt = P.orElseF({ ...Covariant, ...AssociativeEither })
