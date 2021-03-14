// tracing: off

import type { AssociativeBoth } from "../AssociativeBoth"
import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"

export interface Apply<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C>,
    Covariant<F, C> {}
