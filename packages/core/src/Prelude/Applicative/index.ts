// ets_tracing: off

import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"
import type { IdentityBoth } from "../IdentityBoth"

export interface Applicative<F extends URIS, C = Auto>
  extends IdentityBoth<F, C>,
    Covariant<F, C> {}
