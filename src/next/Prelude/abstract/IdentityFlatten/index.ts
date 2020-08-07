import { Any, Any1, Any2, Any3, Any4, Any5, Any6 } from "../Any"
import {
  AssociativeFlatten,
  AssociativeFlatten1,
  AssociativeFlatten2,
  AssociativeFlatten3,
  AssociativeFlatten4,
  AssociativeFlatten5,
  AssociativeFlatten6
} from "../AssociativeFlatten"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface IdentityFlatten<F> extends AssociativeFlatten<F>, Any<F> {}

export interface IdentityFlatten1<F extends URIS>
  extends AssociativeFlatten1<F>,
    Any1<F> {}

export interface IdentityFlatten2<F extends URIS2>
  extends AssociativeFlatten2<F>,
    Any2<F> {}

export interface IdentityFlatten3<F extends URIS3>
  extends AssociativeFlatten3<F>,
    Any3<F> {}

export interface IdentityFlatten4<F extends URIS4>
  extends AssociativeFlatten4<F>,
    Any4<F> {}

export interface IdentityFlatten5<F extends URIS5>
  extends AssociativeFlatten5<F>,
    Any5<F> {}

export interface IdentityFlatten6<F extends URIS6>
  extends AssociativeFlatten6<F>,
    Any6<F> {}
