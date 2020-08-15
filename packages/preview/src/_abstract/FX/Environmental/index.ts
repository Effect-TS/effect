import { CovariantF, CovariantK, CovariantKE } from "../../Covariant"
import { URIS } from "../../HKT"
import {
  IdentityFlattenF,
  IdentityFlattenK,
  IdentityFlattenKE
} from "../../IdentityFlatten"
import { AccessF, AccessK, AccessKE } from "../Access"

export type EnvironmentalF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenF<F, TL0, TL1, TL2, TL3> &
  AccessF<F, TL0, TL1, TL2, TL3> &
  CovariantF<F, TL0, TL1, TL2, TL3>

export type EnvironmentalK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenK<F, TL0, TL1, TL2, TL3> &
  AccessK<F, TL0, TL1, TL2, TL3> &
  CovariantK<F, TL0, TL1, TL2, TL3>

export type EnvironmentalKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenKE<F, E, TL0, TL1, TL2, TL3> &
  AccessKE<F, E, TL0, TL1, TL2, TL3> &
  CovariantKE<F, E, TL0, TL1, TL2, TL3>

export function makeEnvironmental<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    EnvironmentalKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => EnvironmentalKE<URI, E, TL0, TL1, TL2, TL3>
export function makeEnvironmental<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    EnvironmentalK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => EnvironmentalK<URI, TL0, TL1, TL2, TL3>
export function makeEnvironmental<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    EnvironmentalF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => EnvironmentalF<URI, TL0, TL1, TL2, TL3>
export function makeEnvironmental<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    EnvironmentalF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => EnvironmentalF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
