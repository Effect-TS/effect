// ets_tracing: off

import type { AssociativeBoth } from "../AssociativeBoth"
import type * as HKT from "../HKT"

/**
 * An commutative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBoth<F extends HKT.HKT> extends AssociativeBoth<F> {}
