import {
  AssociativeEitherK,
  AssociativeEitherF,
  AssociativeEitherFE,
  AssociativeEitherKE
} from "../AssociativeEither"
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

export interface CommutativeEitherFE<F, E> extends AssociativeEitherFE<F, E> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherKE<F extends URIS, E>
  extends AssociativeEitherKE<F, E> {
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
) => CommutativeEitherF<URI>
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

export function makeCommutativeEitherE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<CommutativeEitherKE<URI, E>, "URI" | "CommutativeEither" | "E">
) => CommutativeEitherKE<URI, E>
export function makeCommutativeEitherE<URI>(
  URI: URI
): <E>() => (
  _: Omit<CommutativeEitherFE<URI, E>, "URI" | "CommutativeEither" | "E">
) => CommutativeEitherFE<URI, E>
export function makeCommutativeEitherE<URI>(
  URI: URI
): <E>() => (
  _: Omit<CommutativeEitherFE<URI, E>, "URI" | "CommutativeEither" | "E">
) => CommutativeEitherFE<URI, E> {
  return () => (_) => ({
    URI,
    CommutativeEither: "CommutativeEither",
    E: undefined as any,
    ..._
  })
}
