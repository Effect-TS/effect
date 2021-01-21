import type * as HKT from "../../HKT"

export interface Provide<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly provide: <R>(
    r: R
  ) => <N extends string, K, Q, W, X, I, S, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, unknown, E, A>
}
