import { AssociativeEitherK, AssociativeEitherF } from "../AssociativeEither"
import { URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F> extends AssociativeEitherF<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherK<F extends URIS> extends AssociativeEitherK<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<URI extends URIS>(
  _: URI
): (
  _: Omit<CommutativeEitherK<URI>, "URI" | "CommutativeEither">
) => CommutativeEitherK<URI>
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
