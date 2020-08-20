import type { HasURI, HKTFull, KindFull, URIS } from "../HKT"
import type { Identity } from "../Identity"

export interface FoldMapF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}
