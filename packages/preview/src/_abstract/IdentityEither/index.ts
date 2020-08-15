import {
  AssociativeEitherF,
  AssociativeEitherK,
  AssociativeEitherKE
} from "../AssociativeEither"
import { URIS } from "../HKT"
import { NoneF, NoneK, NoneKE } from "../None"

/**
 * A binary operator that combines two values of types `F[A]` and `F[B]` to
 * produce an `F[Either[A, B]]` with an identity value.
 */
export type IdentityEitherF<
  F,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeEitherF<F, TL0, TL1, TL2, TL3> & NoneF<F, TL0, TL1, TL2, TL3>

export type IdentityEitherK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeEitherK<F, TL0, TL1, TL2, TL3> & NoneK<F, TL0, TL1, TL2, TL3>

export type IdentityEitherKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = AssociativeEitherKE<F, E, TL0, TL1, TL2, TL3> & NoneKE<F, E, TL0, TL1, TL2, TL3>

export function makeIdentityEither<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityEitherKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => IdentityEitherKE<URI, E, TL0, TL1, TL2, TL3>
export function makeIdentityEither<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityEitherK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityEitherK<URI, TL0, TL1, TL2, TL3>
export function makeIdentityEither<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityEitherF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityEitherF<URI, TL0, TL1, TL2, TL3>
export function makeIdentityEither<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    IdentityEitherF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => IdentityEitherF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
