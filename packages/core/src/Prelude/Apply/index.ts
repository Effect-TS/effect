// ets_tracing: off

import type { AssociativeBoth } from "../AssociativeBoth/index.js"
import type { Covariant } from "../Covariant/index.js"
import type { Auto, URIS } from "../HKT/index.js"

export interface Apply<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C>,
    Covariant<F, C> {}
