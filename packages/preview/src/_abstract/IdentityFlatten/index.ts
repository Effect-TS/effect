import { AnyK, AnyF, AnyFE, AnyKE } from "../Any"
import {
  AssociativeFlattenK,
  AssociativeFlattenF,
  AssociativeFlattenFE,
  AssociativeFlattenKE
} from "../AssociativeFlatten"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<F> = AssociativeFlattenF<F> & AnyF<F>

export type IdentityFlattenK<F extends URIS> = AssociativeFlattenK<F> & AnyK<F>

export type IdentityFlattenFE<F, E> = AssociativeFlattenFE<F, E> & AnyFE<F, E>

export type IdentityFlattenKE<F extends URIS, E> = AssociativeFlattenKE<F, E> &
  AnyKE<F, E>

export function makeIdentityFlatten<URI extends URIS>(
  _: URI
): (_: Omit<IdentityFlattenK<URI>, "URI">) => IdentityFlattenK<URI>
export function makeIdentityFlatten<URI>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI>, "URI">) => IdentityFlattenF<URI>
export function makeIdentityFlatten<URI>(
  URI: URI
): (_: Omit<IdentityFlattenF<URI>, "URI">) => IdentityFlattenF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

export function makeIdentityFlattenE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<IdentityFlattenKE<URI, E>, "URI" | "E">
) => IdentityFlattenKE<URI, E>
export function makeIdentityFlattenE<URI, E>(
  URI: URI
): <E>() => (
  _: Omit<IdentityFlattenFE<URI, E>, "URI" | "E">
) => IdentityFlattenFE<URI, E>
export function makeIdentityFlattenE<URI, E>(
  URI: URI
): <E>() => (
  _: Omit<IdentityFlattenFE<URI, E>, "URI" | "E">
) => IdentityFlattenFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
