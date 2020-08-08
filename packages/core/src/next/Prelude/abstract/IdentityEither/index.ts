import { AssociativeEither6, AssociativeEitherF } from "../AssociativeEither"
import { URIS6 } from "../HKT"
import { None6, NoneF } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<F> = AssociativeEitherF<F> & NoneF<F>

export type IdentityEither6<F extends URIS6> = AssociativeEither6<F> & None6<F>

export function makeIdentityEither<URI extends URIS6>(
  _: URI
): (_: Omit<IdentityEither6<URI>, "URI">) => IdentityEither6<URI>
export function makeIdentityEither<URI>(
  URI: URI
): (_: Omit<IdentityEitherF<URI>, "URI">) => IdentityEitherF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}
