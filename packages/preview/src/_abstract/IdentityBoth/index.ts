import { AnyK, AnyF, AnyFE, AnyKE } from "../Any"
import {
  AssociativeBothK,
  AssociativeBothF,
  AssociativeBothFE,
  AssociativeBothKE
} from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<F> = AssociativeBothF<F> & AnyF<F>

export type IdentityBothFE<F, E> = AssociativeBothFE<F, E> & AnyFE<F, E>

export type IdentityBothK<F extends URIS> = AssociativeBothK<F> & AnyK<F>

export type IdentityBothKE<F extends URIS, E> = AssociativeBothKE<F, E> & AnyKE<F, E>

export function makeIdentityBoth<URI extends URIS>(
  _: URI
): (_: Omit<IdentityBothK<URI>, "URI">) => IdentityBothK<URI>
export function makeIdentityBoth<URI>(
  URI: URI
): (_: Omit<IdentityBothF<URI>, "URI">) => IdentityBothF<URI>
export function makeIdentityBoth<URI>(
  URI: URI
): (_: Omit<IdentityBothF<URI>, "URI">) => IdentityBothF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

export function makeIdentityBothE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<IdentityBothKE<URI, E>, "URI" | "E">) => IdentityBothKE<URI, E>
export function makeIdentityBothE<URI>(
  URI: URI
): <E>() => (_: Omit<IdentityBothFE<URI, E>, "URI" | "E">) => IdentityBothFE<URI, E>
export function makeIdentityBothE<URI>(
  URI: URI
): <E>() => (_: Omit<IdentityBothFE<URI, E>, "URI" | "E">) => IdentityBothFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
