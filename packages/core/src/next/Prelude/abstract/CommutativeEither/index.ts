import {
  AssociativeEitherF,
  AssociativeEither1,
  AssociativeEither2,
  AssociativeEither3,
  AssociativeEither4,
  AssociativeEither5,
  AssociativeEither6
} from "../AssociativeEither"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F> extends AssociativeEitherF<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither1<F extends URIS> extends AssociativeEither1<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither2<F extends URIS2> extends AssociativeEither2<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither3<F extends URIS3> extends AssociativeEither3<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither4<F extends URIS4> extends AssociativeEither4<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither5<F extends URIS5> extends AssociativeEither5<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEither6<F extends URIS6> extends AssociativeEither6<F> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<URI extends URIS>(
  _: URI
): (
  _: Omit<CommutativeEither1<URI>, "URI" | "CommutativeEither">
) => CommutativeEither1<URI>
export function makeCommutativeEither<URI extends URIS2>(
  _: URI
): (
  _: Omit<CommutativeEither2<URI>, "URI" | "CommutativeEither">
) => CommutativeEither2<URI>
export function makeCommutativeEither<URI extends URIS3>(
  _: URI
): (
  _: Omit<CommutativeEither3<URI>, "URI" | "CommutativeEither">
) => CommutativeEither3<URI>
export function makeCommutativeEither<URI extends URIS4>(
  _: URI
): (
  _: Omit<CommutativeEither4<URI>, "URI" | "CommutativeEither">
) => CommutativeEither4<URI>
export function makeCommutativeEither<URI extends URIS5>(
  _: URI
): (
  _: Omit<CommutativeEither5<URI>, "URI" | "CommutativeEither">
) => CommutativeEither5<URI>
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
