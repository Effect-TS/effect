import type { Auto, Base, Kind, OrFix, URIS } from "../../HKT"

export interface Access<F extends URIS, C = Auto> extends Base<F, C> {
  readonly access: <R, A, SI, SO, S>(
    f: (_: OrFix<"R", C, R>) => A
  ) => Kind<
    F,
    OrFix<"N", C, never>,
    OrFix<"K", C, never>,
    SI,
    SO,
    OrFix<"X", C, never>,
    OrFix<"I", C, unknown>,
    OrFix<"S", C, S>,
    OrFix<"R", C, R>,
    OrFix<"E", C, never>,
    A
  >
}
