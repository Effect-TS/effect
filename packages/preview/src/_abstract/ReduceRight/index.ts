import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

export interface ReduceRightF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}

export interface ReduceRightK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly reduce: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => B
}
