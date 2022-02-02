// ets_tracing: off

import type { AssociativeEither } from "../AssociativeEither"
import type { Auto, URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEither<F extends URIS, C = Auto>
  extends AssociativeEither<F, C> {
  readonly _CommutativeEither: "CommutativeEither"
}
