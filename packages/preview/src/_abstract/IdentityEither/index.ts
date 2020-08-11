import { AssociativeEitherF, AssociativeEitherK } from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneF, NoneK } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<F, Fix = any> = AssociativeEitherF<F, Fix> & NoneF<F, Fix>

export type IdentityEitherK<F extends URIS, Fix = any> = AssociativeEitherK<F, Fix> &
  NoneK<F, Fix>

export function makeIdentityEither<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<IdentityEitherK<URI, Fix>, "URI" | "Fix">) => IdentityEitherK<URI, Fix>
export function makeIdentityEither<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityEitherF<URI, Fix>, "URI" | "Fix">) => IdentityEitherF<URI, Fix>
export function makeIdentityEither<URI, Fix = any>(
  URI: URI
): (_: Omit<IdentityEitherF<URI, Fix>, "URI" | "Fix">) => IdentityEitherF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
