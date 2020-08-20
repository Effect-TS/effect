import type { HasURI, HKTFull, KindFull, URIS } from "../HKT"

export interface InvariantF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}

export interface InvariantK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      ma: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
    ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, B>
    g: <K, NK extends string, SI, SO, X, In, S, Env, Err>(
      mb: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, B>
    ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  }
}
