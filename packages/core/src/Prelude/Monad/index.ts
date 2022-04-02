import type { Covariant } from "../Covariant/index.js"
import type * as HKT from "../HKT/index.js"
import type { IdentityFlatten } from "../IdentityFlatten/index.js"

export interface Monad<F extends HKT.HKT> extends IdentityFlatten<F>, Covariant<F> {}
