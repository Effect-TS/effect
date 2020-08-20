import { Auto, Base, Initial, Kind, OrFix, URIS } from "../HKT"

export interface Any<F extends URIS, C = Auto> extends Base<F, C> {
  readonly any: <N extends string, K, SI, SO, X, I, S, R, E>() => Kind<
    F,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, Initial<C, "X", X>>,
    OrFix<"I", C, Initial<C, "I", I>>,
    OrFix<"S", C, Initial<C, "S", S>>,
    OrFix<"R", C, Initial<C, "R", R>>,
    OrFix<"E", C, Initial<C, "E", E>>,
    any
  >
}
