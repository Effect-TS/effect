import {
  AssociativeBothF,
  AssociativeBoth1,
  AssociativeBoth2,
  AssociativeBoth3,
  AssociativeBoth4,
  AssociativeBoth5,
  AssociativeBoth6
} from "../AssociativeBoth"
import { URIS, URIS2, URIS3, URIS4, URIS5, URIS6 } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F> extends AssociativeBothF<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth1<F extends URIS> extends AssociativeBoth1<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth2<F extends URIS2> extends AssociativeBoth2<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth3<F extends URIS3> extends AssociativeBoth3<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth4<F extends URIS4> extends AssociativeBoth4<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth5<F extends URIS5> extends AssociativeBoth5<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBoth6<F extends URIS6> extends AssociativeBoth6<F> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS>(
  _: URI
): (_: Omit<CommutativeBoth1<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth1<URI>
export function makeCommutativeBoth<URI extends URIS2>(
  _: URI
): (_: Omit<CommutativeBoth2<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth2<URI>
export function makeCommutativeBoth<URI extends URIS3>(
  _: URI
): (_: Omit<CommutativeBoth3<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth3<URI>
export function makeCommutativeBoth<URI extends URIS4>(
  _: URI
): (_: Omit<CommutativeBoth4<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth4<URI>
export function makeCommutativeBoth<URI extends URIS5>(
  _: URI
): (_: Omit<CommutativeBoth5<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth5<URI>
export function makeCommutativeBoth<URI extends URIS6>(
  _: URI
): (_: Omit<CommutativeBoth6<URI>, "URI" | "CommutativeBoth">) => CommutativeBoth6<URI>
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
