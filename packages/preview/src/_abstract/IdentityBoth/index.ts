import { AnyF, AnyK, AnyKE } from "../Any"
import {
  AssociativeBothF,
  AssociativeBothK,
  AssociativeBothKE
} from "../AssociativeBoth"
import { URIS } from "../HKT"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[(A, B)]` with an identity.
 */
export type IdentityBothF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeBothF<F, TL0, TL1, TL2, TL3> & AnyF<F, TL0, TL1, TL2, TL3>

export type IdentityBothK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeBothK<F, TL0, TL1, TL2, TL3> & AnyK<F, TL0, TL1, TL2, TL3>

export type IdentityBothKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeBothKE<F, E, TL0, TL1, TL2, TL3> & AnyKE<F, E, TL0, TL1, TL2, TL3>

export function makeIdentityBoth<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityBothKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => IdentityBothKE<URI, E, TL0, TL1, TL2, TL3>
export function makeIdentityBoth<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<IdentityBothK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => IdentityBothK<URI, TL0, TL1, TL2, TL3>
export function makeIdentityBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<IdentityBothF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => IdentityBothF<URI, TL0, TL1, TL2, TL3>
export function makeIdentityBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<IdentityBothF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => IdentityBothF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
