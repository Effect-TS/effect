import type * as HKT from "@effect-ts/hkt"

export interface Extend<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly _Extend: "Extend"
  readonly extend: <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    f: (_: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>) => B
  ) => (
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}
