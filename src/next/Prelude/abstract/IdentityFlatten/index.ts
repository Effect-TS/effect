import { AnyF, Any1, Any2, Any3, Any4, Any5, Any6 } from "../Any"
import {
  AssociativeFlattenF,
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
export type IdentityFlattenF<F> = AssociativeFlattenF<F> & AnyF<F>

export type IdentityFlatten1<F extends URIS> = AssociativeFlatten1<F> & Any1<F>

export type IdentityFlatten2<F extends URIS2> = AssociativeFlatten2<F> & Any2<F>

export type IdentityFlatten3<F extends URIS3> = AssociativeFlatten3<F> & Any3<F>

export type IdentityFlatten4<F extends URIS4> = AssociativeFlatten4<F> & Any4<F>

export type IdentityFlatten5<F extends URIS5> = AssociativeFlatten5<F> & Any5<F>

export type IdentityFlatten6<F extends URIS6> = AssociativeFlatten6<F> & Any6<F>

export function makeIdentityFlatten<URI extends URIS>(
  _: URI
): (_: Omit<IdentityFlatten1<URI>, "URI">) => IdentityFlatten1<URI>
export function makeIdentityFlatten<URI extends URIS2>(
  _: URI
): (_: Omit<IdentityFlatten2<URI>, "URI">) => IdentityFlatten2<URI>
export function makeIdentityFlatten<URI extends URIS3>(
  _: URI
): (_: Omit<IdentityFlatten3<URI>, "URI">) => IdentityFlatten3<URI>
export function makeIdentityFlatten<URI extends URIS4>(
  _: URI
): (_: Omit<IdentityFlatten4<URI>, "URI">) => IdentityFlatten4<URI>
export function makeIdentityFlatten<URI extends URIS5>(
  _: URI
): (_: Omit<IdentityFlatten5<URI>, "URI">) => IdentityFlatten5<URI>
export function makeIdentityFlatten<URI extends URIS6>(
  _: URI
): (_: Omit<IdentityFlatten6<URI>, "URI">) => IdentityFlatten6<URI>
export function makeIdentityFlatten<URI>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI>, "URI">) => IdentityFlattenF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
