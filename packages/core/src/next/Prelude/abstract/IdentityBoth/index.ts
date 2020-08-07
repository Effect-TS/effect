import { AnyF, Any1, Any2, Any3, Any4, Any5, Any6 } from "../Any"
import {
  AssociativeBothF,
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
export type IdentityBothF<F> = AssociativeBothF<F> & AnyF<F>

export type IdentityBoth1<F extends URIS> = AssociativeBoth1<F> & Any1<F>

export type IdentityBoth2<F extends URIS2> = AssociativeBoth2<F> & Any2<F>

export type IdentityBoth3<F extends URIS3> = AssociativeBoth3<F> & Any3<F>

export type IdentityBoth4<F extends URIS4> = AssociativeBoth4<F> & Any4<F>

export type IdentityBoth5<F extends URIS5> = AssociativeBoth5<F> & Any5<F>

export type IdentityBoth6<F extends URIS6> = AssociativeBoth6<F> & Any6<F>

export function makeIdentityBoth<URI extends URIS>(
  _: URI
): (_: Omit<IdentityBoth1<URI>, "URI">) => IdentityBoth1<URI>
export function makeIdentityBoth<URI extends URIS2>(
  _: URI
): (_: Omit<IdentityBoth2<URI>, "URI">) => IdentityBoth2<URI>
export function makeIdentityBoth<URI extends URIS3>(
  _: URI
): (_: Omit<IdentityBoth3<URI>, "URI">) => IdentityBoth3<URI>
export function makeIdentityBoth<URI extends URIS4>(
  _: URI
): (_: Omit<IdentityBoth4<URI>, "URI">) => IdentityBoth4<URI>
export function makeIdentityBoth<URI extends URIS5>(
  _: URI
): (_: Omit<IdentityBoth5<URI>, "URI">) => IdentityBoth5<URI>
export function makeIdentityBoth<URI extends URIS6>(
  _: URI
): (_: Omit<IdentityBoth6<URI>, "URI">) => IdentityBoth6<URI>
export function makeIdentityBoth<URI>(
  URI: URI
): (_: Omit<IdentityBothF<URI>, "URI">) => IdentityBothF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
