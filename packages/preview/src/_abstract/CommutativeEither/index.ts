import { AssociativeEitherK, AssociativeEitherF } from "../AssociativeEither"
import { HasE, URIS } from "../HKT"

/**
 * A commutative binary operator that combines two values of types `F[A]` and
 * `F[B]` to produce an `F[Either[A, B]]`.
 */
export interface CommutativeEitherF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends AssociativeEitherF<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeEitherK<F, TL0, TL1, TL2, TL3> {
  readonly CommutativeEither: "CommutativeEither"
}

export interface CommutativeEitherKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends AssociativeEitherK<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly CommutativeEither: "CommutativeEither"
}

export function makeCommutativeEither<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeEitherKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeEither" | "_E"
  >
) => CommutativeEitherKE<URI, E, TL0, TL1, TL2, TL3>
export function makeCommutativeEither<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeEitherK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeEither"
  >
) => CommutativeEitherK<URI, TL0, TL1, TL2, TL3>
export function makeCommutativeEither<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeEitherF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeEither"
  >
) => CommutativeEitherF<URI, TL0, TL1, TL2, TL3>
export function makeCommutativeEither<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CommutativeEitherF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "CommutativeEither"
  >
) => CommutativeEitherF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    CommutativeEither: "CommutativeEither",
    ..._
  })
}
