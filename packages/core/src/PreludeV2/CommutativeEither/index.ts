// ets_tracing: off

import type { AssociativeEither } from "../AssociativeEither"
import type * as HKT from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEither<F extends HKT.HKT> extends AssociativeEither<F> {}
