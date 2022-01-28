import type { Covariant } from "../Covariant"
import type * as HKT from "../HKT"
import type { IdentityFlatten } from "../IdentityFlatten"

export interface Monad<F extends HKT.HKT> extends IdentityFlatten<F>, Covariant<F> {}
