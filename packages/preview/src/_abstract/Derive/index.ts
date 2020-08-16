import { HKTFull, KindFull, URIS } from "../HKT"

export interface DeriveF<F, Typeclass, TL0 = any, TL1 = any, TL2 = any, TL3 = any> {
  readonly Derive: "Derive"
  readonly TL0: TL0
  readonly TL1: TL1
  readonly TL2: TL2
  readonly TL3: TL3
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: HKTFull<Typeclass, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFull<
    Typeclass,
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export interface DeriveK<
  F extends URIS,
  Typeclass extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  readonly Derive: "Derive"
  readonly TL0: TL0
  readonly TL1: TL1
  readonly TL2: TL2
  readonly TL3: TL3
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: KindFull<Typeclass, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFull<
    Typeclass,
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export interface DeriveKE<
  F extends URIS,
  Typeclass extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> {
  readonly Derive: "Derive"
  readonly TL0: TL0
  readonly TL1: TL1
  readonly TL2: TL2
  readonly TL3: TL3
  readonly _E: E
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, A>(
    fa: KindFull<Typeclass, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => KindFull<
    Typeclass,
    TL0,
    TL1,
    TL2,
    TL3,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    E,
    KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, E, A>
  >
}

export function makeDerive<F extends URIS, Typeclass extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<DeriveKE<F, Typeclass, E>, "Derive" | "TL0" | "TL1" | "TL2" | "TL3" | "_E">
) => DeriveKE<F, Typeclass, E, TL0, TL1, TL2, TL3>
export function makeDerive<F extends URIS, Typeclass extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<DeriveK<F, Typeclass>, "Derive" | "TL0" | "TL1" | "TL2" | "TL3">
) => DeriveK<F, Typeclass, TL0, TL1, TL2, TL3>
export function makeDerive<F, Typeclass>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<DeriveF<F, Typeclass>, "Derive" | "TL0" | "TL1" | "TL2" | "TL3">
) => DeriveF<F, Typeclass, TL0, TL1, TL2, TL3>
export function makeDerive<F, Typeclass>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<DeriveF<F, Typeclass>, "Derive" | "TL0" | "TL1" | "TL2" | "TL3">
) => DeriveF<F, Typeclass, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    Derive: "Derive",
    ..._
  })
}
