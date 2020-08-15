import {
  AssociativeBothK,
  AssociativeBothF,
  AssociativeBothKE
} from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface CommutativeBothF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends AssociativeBothF<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeBothK<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export interface CommutativeBothKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeBothKE<F, E, TL0, TL1, TL2, TL3> {
  readonly CommutativeBoth: "CommutativeBoth"
}

export function makeCommutativeBoth<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeBothKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeBoth" | "_E"
  >
) => CommutativeBothKE<URI, E, TL0, TL1, TL2, TL3>
export function makeCommutativeBoth<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeBothK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeBoth"
  >
) => CommutativeBothK<URI, TL0, TL1, TL2, TL3>
export function makeCommutativeBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeBothF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeBoth"
  >
) => CommutativeBothF<URI, TL0, TL1, TL2, TL3>
export function makeCommutativeBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeBothF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeBoth"
  >
) => CommutativeBothF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    CommutativeBoth: "CommutativeBoth",
    ..._
  })
}
