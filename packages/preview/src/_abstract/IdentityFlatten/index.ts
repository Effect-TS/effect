import { AnyF, AnyK, AnyKE } from "../Any"
import {
  AssociativeFlattenF,
  AssociativeFlattenK,
  AssociativeFlattenKE
} from "../AssociativeFlatten"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityFlattenF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeFlattenF<F, TL0, TL1, TL2, TL3> & AnyF<F, TL0, TL1, TL2, TL3>

export type IdentityFlattenK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeFlattenK<F, TL0, TL1, TL2, TL3> & AnyK<F, TL0, TL1, TL2, TL3>

export type IdentityFlattenKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeFlattenKE<F, E, TL0, TL1, TL2, TL3> & AnyKE<F, E, TL0, TL1, TL2, TL3>

export function makeIdentityFlatten<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityFlattenKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => IdentityFlattenKE<URI, E, TL0, TL1, TL2, TL3>
export function makeIdentityFlatten<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityFlattenK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityFlattenK<URI, TL0, TL1, TL2, TL3>
export function makeIdentityFlatten<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityFlattenF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityFlattenF<URI, TL0, TL1, TL2, TL3>
export function makeIdentityFlatten<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityFlattenF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityFlattenF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
