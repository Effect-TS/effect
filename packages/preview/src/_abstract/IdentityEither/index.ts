import { AssociativeEitherF, AssociativeEitherK } from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneF, NoneK } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<
  F,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeEitherF<F, Fix0, Fix1, Fix2, Fix3> & NoneF<F, Fix0, Fix1, Fix2, Fix3>

export type IdentityEitherK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> = AssociativeEitherK<F, Fix0, Fix1, Fix2, Fix3> & NoneK<F, Fix0, Fix1, Fix2, Fix3>

export function makeIdentityEither<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    IdentityEitherK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityEitherK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityEither<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityEitherF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeIdentityEither<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    IdentityEitherF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3"
  >
) => IdentityEitherF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    ..._
  })
}
