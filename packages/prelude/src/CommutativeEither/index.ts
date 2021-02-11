import type { Auto, URIS } from "@effect-ts/hkt"

import type { AssociativeEither } from "../AssociativeEither"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEither<F extends URIS, C = Auto>
  extends AssociativeEither<F, C> {
  readonly _CommutativeEither: "CommutativeEither"
}
