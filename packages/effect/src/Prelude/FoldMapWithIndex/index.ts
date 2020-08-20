import type { Identity } from "../../Classic/Identity"
import type { Auto, Base, IndexFor, Kind, OrFix, URIS } from "../HKT"

export interface FoldMapWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly foldMapWithIndex: FoldMapWithIndexFn<F, C>
}

export interface FoldMapWithIndexFn<F extends URIS, C = Auto> {
  <M>(I: Identity<M>): <N extends string, K, A>(
    f: (k: IndexFor<F, OrFix<"N", C, N>, OrFix<"K", C, K>>, a: A) => M
  ) => <SI, SO, X, I, S, R, E>(
    fa: Kind<
      F,
      C,
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
  ) => M
}
