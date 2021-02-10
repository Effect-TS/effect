import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"
import type { IdentityFlatten } from "../IdentityFlatten"

export interface Monad<F extends URIS, C = Auto>
  extends IdentityFlatten<F, C>,
    Covariant<F, C> {}
