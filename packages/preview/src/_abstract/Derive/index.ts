import { HKTFix, KindFix, URIS } from "../HKT"

export interface DeriveF<F, Typeclass, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> {
  readonly Derive: "Derive"
  readonly Fix0: Fix0
  readonly Fix1: Fix1
  readonly Fix2: Fix2
  readonly Fix3: Fix3
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: HKTFix<Typeclass, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    Typeclass,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export interface DeriveK<
  F extends URIS,
  Typeclass extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> {
  readonly Derive: "Derive"
  readonly Fix0: Fix0
  readonly Fix1: Fix1
  readonly Fix2: Fix2
  readonly Fix3: Fix3
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: KindFix<Typeclass, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    Typeclass,
    Fix0,
    Fix1,
    Fix2,
    Fix3,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export function makeDerive<
  F extends URIS,
  Typeclass extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: F,
  __: Typeclass
): (
  _: Omit<DeriveK<F, Typeclass>, "Derive" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => DeriveK<F, Typeclass, Fix0, Fix1, Fix2, Fix3>
export function makeDerive<
  F,
  Typeclass,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: F,
  __: Typeclass
): (
  _: Omit<DeriveF<F, Typeclass>, "Derive" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => DeriveF<F, Typeclass, Fix0, Fix1, Fix2, Fix3>
export function makeDerive<
  F,
  Typeclass,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: F,
  __: Typeclass
): (
  _: Omit<DeriveF<F, Typeclass>, "Derive" | "Fix0" | "Fix1" | "Fix2" | "Fix3">
) => DeriveF<F, Typeclass, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    Derive: "Derive",
    ..._
  })
}
