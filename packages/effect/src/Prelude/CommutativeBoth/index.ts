/**
 * @since 1.0.0
 */
import { AssociativeBoth } from "../AssociativeBoth"
import { Auto, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 *
 * @since 1.0.0
 */
export interface CommutativeBoth<F extends URIS, C = Auto>
  extends AssociativeBoth<F, C> {
  readonly CommutativeBoth: "CommutativeBoth"
}
