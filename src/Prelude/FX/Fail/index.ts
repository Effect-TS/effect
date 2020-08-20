import type { Auto, Base, Kind, OrFix, URIS } from "../../HKT"

export interface Fail<F extends URIS, C = Auto> extends Base<F, C> {
  readonly fail: <SI, SO, S, E, A = never>(
    e: OrFix<"E", C, E>
  ) => Kind<
    F,
    C,
    OrFix<"N", C, never>,
    OrFix<"K", C, never>,
    SI,
    SO,
    OrFix<"X", C, never>,
    OrFix<"I", C, unknown>,
    OrFix<"S", C, S>,
    OrFix<"R", C, unknown>,
    OrFix<"E", C, E>,
    A
  >
}
