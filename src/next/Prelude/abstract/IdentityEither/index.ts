import { AssociativeEitherK, AssociativeEitherF } from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneK, NoneF } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<F> = AssociativeEitherF<F> & NoneF<F>

export type IdentityEitherK<F extends URIS> = AssociativeEitherK<F> & NoneK<F>

export function makeIdentityEither<URI extends URIS>(
  _: URI
): (_: Omit<IdentityEitherK<URI>, "URI">) => IdentityEitherK<URI>
export function makeIdentityEither<URI>(
  URI: URI
): (_: Omit<IdentityEitherF<URI>, "URI">) => IdentityEitherF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
