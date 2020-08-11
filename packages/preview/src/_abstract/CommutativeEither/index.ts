import { AssociativeEitherK, AssociativeEitherF } from "../AssociativeEither"
import { URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F, Fix = any> extends AssociativeEitherF<F, Fix> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherK<F extends URIS, Fix = any>
  extends AssociativeEitherK<F, Fix> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<URI extends URIS, Fix = any>(
  _: URI
): (
  _: Omit<CommutativeEitherK<URI, Fix>, "URI" | "Fix" | "CommutativeEither">
) => CommutativeEitherK<URI, Fix>
export function makeCommutativeEither<URI, Fix = any>(
  URI: URI
): (
  _: Omit<CommutativeEitherF<URI, Fix>, "URI" | "Fix" | "CommutativeEither">
) => CommutativeEitherF<URI, Fix>
export function makeCommutativeEither<URI, Fix = any>(
  URI: URI
): (
  _: Omit<CommutativeEitherF<URI, Fix>, "URI" | "Fix" | "CommutativeEither">
) => CommutativeEitherF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    CommutativeEither: "CommutativeEither",
    ..._
  })
}
