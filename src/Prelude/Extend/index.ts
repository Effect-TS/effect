import type { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface Extend<F extends URIS, C = Auto> extends Base<F, C> {
  readonly extend: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(
    f: (
      _: Kind<
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
  ) => (
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
  ) => Kind<
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
    B
  >
}
