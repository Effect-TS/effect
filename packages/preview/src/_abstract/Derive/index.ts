import { HKTFix, KindFix, URIS } from "../HKT"

export interface DeriveF<F, Typeclass, Fix = any> {
  readonly Derive: "Derive"
  readonly Fix: Fix
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: HKTFix<Typeclass, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTFix<
    Typeclass,
    Fix,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    HKTFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export interface DeriveK<F extends URIS, Typeclass extends URIS, Fix = any> {
  readonly Derive: "Derive"
  readonly Fix: Fix
  readonly derive: <K, NK extends string, SI, SO, X, In, S, Env, Err, A>(
    fa: KindFix<Typeclass, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindFix<
    Typeclass,
    Fix,
    K,
    NK,
    SI,
    SO,
    X,
    In,
    S,
    Env,
    Err,
    KindFix<F, Fix, K, NK, SI, SO, X, In, S, Env, Err, A>
  >
}

export function makeDerive<F extends URIS, Typeclass extends URIS, Fix = any>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveK<F, Typeclass>, "Derive" | "Fix">) => DeriveK<F, Typeclass, Fix>
export function makeDerive<F, Typeclass, Fix = any>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveF<F, Typeclass>, "Derive" | "Fix">) => DeriveF<F, Typeclass, Fix>
export function makeDerive<F, Typeclass, Fix = any>(
  _: F,
  __: Typeclass
): (_: Omit<DeriveF<F, Typeclass>, "Derive" | "Fix">) => DeriveF<F, Typeclass, Fix> {
  return (_) => ({
    Fix: undefined as any,
    Derive: "Derive",
    ..._
  })
}
