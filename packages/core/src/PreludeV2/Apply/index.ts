// ets_tracing: off

import type { AssociativeBoth } from "../AssociativeBoth"
import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"

export interface Apply<F extends HKT.HKT> extends AssociativeBoth<F>, Covariant<F> {}
