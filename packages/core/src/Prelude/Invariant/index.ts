import type { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface Invariant<F extends URIS, C = Auto> extends Base<F, C> {
  readonly invmap: <A, B>(fg: {
    f: (a: A) => B
    g: (b: B) => A
  }) => {
    f: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: Kind<
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
    ) => Kind<
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
      B
    >
    g: <N extends string, K, SI, SO, X, I, S, R, E>(
      ma: Kind<
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
        B
      >
    ) => Kind<
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
  }
}
