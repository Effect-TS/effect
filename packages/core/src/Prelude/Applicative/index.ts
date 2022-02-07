// ets_tracing: off

import type { Covariant } from "../Covariant/index.js"
import type { Auto, URIS } from "../HKT/index.js"
import type { IdentityBoth } from "../IdentityBoth/index.js"

export interface Applicative<F extends URIS, C = Auto>
  extends IdentityBoth<F, C>,
    Covariant<F, C> {}
