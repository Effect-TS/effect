import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { URIS } from "../HKT"
import {
  IdentityFlattenF,
  IdentityFlattenK,
  IdentityFlattenKE
} from "../IdentityFlatten"

export type MonadF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> = IdentityFlattenF<
  F,
  TL0,
  TL1,
  TL2,
  TL3
> &
  CovariantF<F, TL0, TL1, TL2, TL3>

export type MonadK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>

export type MonadKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityFlattenKE<F, E, TL0, TL1, TL2, TL3> & CovariantKE<F, E, TL0, TL1, TL2, TL3>

export function makeMonad<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    MonadKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => MonadKE<URI, E, TL0, TL1, TL2, TL3>
export function makeMonad<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<MonadK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => MonadK<URI, TL0, TL1, TL2, TL3>
export function makeMonad<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<MonadF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => MonadF<URI, TL0, TL1, TL2, TL3>
export function makeMonad<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<MonadF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => MonadF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
