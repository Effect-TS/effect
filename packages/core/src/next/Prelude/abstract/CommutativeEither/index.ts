import { AssociativeEither6, AssociativeEitherF } from "../AssociativeEither"
import { URIS6 } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F> extends AssociativeEitherF<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither6<F extends URIS6> extends AssociativeEither6<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<URI extends URIS6>(
  _: URI
): (
  _: Omit<CommutativeEither6<URI>, "URI" | "CommutativeEither">
) => CommutativeEither6<URI>
export function makeCommutativeEither<URI>(
  URI: URI
): (
  _: Omit<CommutativeEitherF<URI>, "URI" | "CommutativeEither">
) => CommutativeEitherF<URI> {
  return (_) => ({
    URI,
    CommutativeEither: "CommutativeEither",
    ..._
  })
}
