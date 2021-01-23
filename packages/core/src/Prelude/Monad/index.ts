import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"
import type { IdentityFlatten } from "../IdentityFlatten"

export type Monad<F extends URIS, C = Auto> = IdentityFlatten<F, C> & Covariant<F, C>
