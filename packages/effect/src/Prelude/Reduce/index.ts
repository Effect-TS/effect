import type { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface Reduce<F extends URIS, C = Auto> extends Base<F, C> {
  readonly reduce: <A, B>(
    b: B,
    f: (b: B, a: A) => B
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
  ) => B
}
