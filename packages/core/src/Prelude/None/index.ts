import type { Auto, Base, Initial, Kind, OrFix, URIS } from "../HKT"

export interface None<F extends URIS, C = Auto> extends Base<F, C> {
  readonly never: <N extends string, K = unknown, SI = unknown, SO = unknown>() => Kind<
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
    OrFix<"E", C, Initial<C, "X">>,
    never
  >
}
