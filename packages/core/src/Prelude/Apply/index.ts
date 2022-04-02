// ets_tracing: off

import type { AssociativeBoth } from "../AssociativeBoth/index.js"
import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"

export interface Apply<F extends HKT.HKT> extends AssociativeBoth<F>, Covariant<F> {}
