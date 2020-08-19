/**
 * @since 1.0.0
 */
import { AssociativeEither } from "../AssociativeEither"
import { Auto, URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 *
 * @since 1.0.0
 */
export interface CommutativeEither<F extends URIS, C = Auto>
  extends AssociativeEither<F, C> {
  readonly CommutativeEither: "CommutativeEither"
}
