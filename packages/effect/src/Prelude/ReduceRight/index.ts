import { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface ReduceRight<F extends URIS, C = Auto> extends Base<F, C> {
  readonly reduceRight: <A, B>(
    b: B,
    f: (a: A, b: B) => B
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
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
