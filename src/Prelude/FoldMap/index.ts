import type { Identity } from "../../Classic/Identity"
import type { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface FoldMap<F extends URIS, C = Auto> extends Base<F, C> {
  readonly foldMap: FoldMapFn<F, C>
}

export interface FoldMapFn<F extends URIS, C = Auto> {
  <M>(I: Identity<M>): <A>(
    f: (a: A) => M
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
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
