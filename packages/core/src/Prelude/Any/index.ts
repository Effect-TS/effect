import type { Auto, Base, Initial, Kind, OrFix, URIS } from "../HKT"

export interface Any<F extends URIS, C = Auto> extends Base<F, C> {
  readonly any: <N extends string, K, SI, SO>() => Kind<
    F,
    C,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, Initial<C, "X">>,
    OrFix<"I", C, Initial<C, "I">>,
    OrFix<"S", C, Initial<C, "S">>,
    OrFix<"R", C, Initial<C, "R">>,
    OrFix<"E", C, Initial<C, "E">>,
    any
  >
}
