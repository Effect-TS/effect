import {
  AssociativeBothK,
  AssociativeBothF,
  AssociativeBothFE,
  AssociativeBothKE
} from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F> extends AssociativeBothF<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<F extends URIS> extends AssociativeBothK<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothFE<F, E> extends AssociativeBothFE<F, E> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothKE<F extends URIS, E> extends AssociativeBothKE<F, E> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<CommutativeBothK<URI>, "URI" | "CommutativeBoth">) => CommutativeBothK<URI>
export function makeCommutativeBoth<URI>(
  URI: URI
): (_: Omit<CommutativeBothF<URI>, "URI" | "CommutativeBoth">) => CommutativeBothF<URI>
export function makeCommutativeBoth<URI>(
  URI: URI
): (
  _: Omit<CommutativeBothF<URI>, "URI" | "CommutativeBoth">
) => CommutativeBothF<URI> {
  return (_) => ({
    URI,
    CommutativeBoth: "CommutativeBoth",
    ..._
  })
}

export function makeCommutativeBothE<URI extends URIS>(
  _: URI
): <E>() => (
  _: Omit<CommutativeBothKE<URI, E>, "URI" | "CommutativeBoth" | "E">
) => CommutativeBothKE<URI, E>
export function makeCommutativeBothE<URI>(
  URI: URI
): <E>() => (
  _: Omit<CommutativeBothFE<URI, E>, "URI" | "CommutativeBoth" | "E">
) => CommutativeBothFE<URI, E>
export function makeCommutativeBothE<URI>(
  URI: URI
): <E>() => (
  _: Omit<CommutativeBothFE<URI, E>, "URI" | "CommutativeBoth" | "E">
) => CommutativeBothFE<URI, E> {
  return () => (_) => ({
    URI,
    CommutativeBoth: "CommutativeBoth",
    E: undefined as any,
    ..._
  })
}
