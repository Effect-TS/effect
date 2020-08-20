import { URIS, Auto, Base, Kind, OrFix, IndexFor } from "../HKT"

export interface ReduceWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly reduceWithIndex: ReduceWithIndexFn<F, C>
}

export interface ReduceWithIndexFn<F extends URIS, C = Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: IndexFor<F, OrFix<"N", C, N>, OrFix<"K", C, K>>, b: B, a: A) => B
  ): <SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, X>,
      OrFix<"I", C, I>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R>,
      OrFix<"E", C, E>,
      A
    >
  ) => B
}
