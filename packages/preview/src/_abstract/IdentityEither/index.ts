import {
  AssociativeEitherK,
  AssociativeEitherF,
  AssociativeEitherKE,
  AssociativeEitherFE
} from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneK, NoneF, NoneKE, NoneFE } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<F> = AssociativeEitherF<F> & NoneF<F>

export type IdentityEitherK<F extends URIS> = AssociativeEitherK<F> & NoneK<F>

export type IdentityEitherFE<F, E> = AssociativeEitherFE<F, E> & NoneFE<F, E>

export type IdentityEitherKE<F extends URIS, E> = AssociativeEitherKE<F, E> &
  NoneKE<F, E>

export function makeIdentityEither<URI extends URIS>(
  _: URI
): (_: Omit<IdentityEitherK<URI>, "URI">) => IdentityEitherK<URI>
export function makeIdentityEither<URI>(
  URI: URI
): (_: Omit<IdentityEitherF<URI>, "URI">) => IdentityEitherF<URI>
export function makeIdentityEither<URI>(
  URI: URI
): (_: Omit<IdentityEitherF<URI>, "URI">) => IdentityEitherF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

export function makeIdentityEitherE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<IdentityEitherKE<URI, E>, "URI" | "E">) => IdentityEitherKE<URI, E>
export function makeIdentityEitherE<URI, E>(
  URI: URI
): <E>() => (_: Omit<IdentityEitherFE<URI, E>, "URI" | "E">) => IdentityEitherFE<URI, E>
export function makeIdentityEitherE<URI, E>(
  URI: URI
): <E>() => (
  _: Omit<IdentityEitherFE<URI, E>, "URI" | "E">
) => IdentityEitherFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
