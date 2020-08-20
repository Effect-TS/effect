import type { Auto, Base, Kind, OrFix, URIS } from "../../HKT"

export interface Provide<F extends URIS, C = Auto> extends Base<F, C> {
  readonly provide: <R>(
    r: OrFix<"R", C, R>
  ) => <N extends string, K, SI, SO, X, I, S, E, A>(
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
    OrFix<"R", C, unknown>,
    OrFix<"E", C, E>,
    A
  >
}
