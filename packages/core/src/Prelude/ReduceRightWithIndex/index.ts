import type { Auto, Base, IndexFor, Kind, OrFix, URIS } from "../HKT"

export interface ReduceRightWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<F, C>
}

export interface ReduceRightWithIndexFn<F extends URIS, C = Auto> {
  <N extends string, K, A, B>(
    b: B,
    f: (k: IndexFor<F, OrFix<"N", C, N>, OrFix<"K", C, K>>, a: A, b: B) => B
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
