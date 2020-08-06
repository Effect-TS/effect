import { Any, Any1, Any2, Any3, Any4, Any5, Any6 } from "../Any"
import {
  AssociativeBoth,
  AssociativeBoth1,
  AssociativeBoth2,
  AssociativeBoth3,
  AssociativeBoth4,
  AssociativeBoth5,
  AssociativeBoth6
} from "../AssociativeBoth"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export interface IdentityBoth<F> extends AssociativeBoth<F>, Any<F> {}

export interface IdentityBoth1<F extends URIS> extends AssociativeBoth1<F>, Any1<F> {}

export interface IdentityBoth2<F extends URIS2> extends AssociativeBoth2<F>, Any2<F> {}

export interface IdentityBoth3<F extends URIS3> extends AssociativeBoth3<F>, Any3<F> {}

export interface IdentityBoth4<F extends URIS4> extends AssociativeBoth4<F>, Any4<F> {}

export interface IdentityBoth5<F extends URIS5> extends AssociativeBoth5<F>, Any5<F> {}

export interface IdentityBoth6<F extends URIS6> extends AssociativeBoth6<F>, Any6<F> {}
