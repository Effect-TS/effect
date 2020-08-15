import { CovariantF, CovariantK, CovariantKE } from "../Covariant"
import { URIS } from "../HKT"
import { IdentityBothF, IdentityBothK, IdentityBothKE } from "../IdentityBoth"

export type ApplicativeF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> = IdentityBothF<
  F,
  TL0,
  TL1,
  TL2,
  TL3
> &
  CovariantF<F, TL0, TL1, TL2, TL3>

export type ApplicativeK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityBothK<F, TL0, TL1, TL2, TL3> & CovariantK<F, TL0, TL1, TL2, TL3>

export type ApplicativeKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = IdentityBothKE<F, E, TL0, TL1, TL2, TL3> & CovariantKE<F, E, TL0, TL1, TL2, TL3>

export function makeApplicative<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    ApplicativeKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => ApplicativeKE<URI, E, TL0, TL1, TL2, TL3>
export function makeApplicative<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<ApplicativeK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ApplicativeK<URI, TL0, TL1, TL2, TL3>
export function makeApplicative<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<ApplicativeF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ApplicativeF<URI, TL0, TL1, TL2, TL3>
export function makeApplicative<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<ApplicativeF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => ApplicativeF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
