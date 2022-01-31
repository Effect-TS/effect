// ets_tracing: off

import type { Covariant } from "../Covariant/index.js"
import type { Auto, URIS } from "../HKT/index.js"
import type { IdentityFlatten } from "../IdentityFlatten/index.js"

export interface Monad<F extends URIS, C = Auto>
  extends IdentityFlatten<F, C>,
    Covariant<F, C> {}
