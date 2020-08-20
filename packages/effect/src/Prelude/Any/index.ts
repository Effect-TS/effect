import { Auto, Base, Intro, Kind, OrFix, URIS } from "../HKT"

export interface Any<F extends URIS, C = Auto> extends Base<F, C> {
  readonly any: <N extends string, K, SI, SO, X, I, S, R, E>() => Kind<
    F,
    OrFix<"N", C, N>,
    OrFix<"K", C, K>,
    SI,
    SO,
    OrFix<"X", C, Intro<C, "X", X, any>>,
    OrFix<"I", C, Intro<C, "I", I, any>>,
    OrFix<"S", C, Intro<C, "X", S, any>>,
    OrFix<"R", C, Intro<C, "R", R, any>>,
    OrFix<"E", C, Intro<C, "E", E, any>>,
    any
  >
}
