import { Auto, Base, Kind, OrFix, URIS } from "../HKT"

export interface Any<F extends URIS, C = Auto> extends Base<F, C> {
  readonly any: <S, SI, SO>() => Kind<
    F,
    OrFix<"N", C, any>,
    OrFix<"K", C, any>,
    SI,
    SO,
    OrFix<"X", C, any>,
    OrFix<"I", C, any>,
    OrFix<"S", C, S>,
    OrFix<"R", C, any>,
    OrFix<"E", C, any>,
    any
  >
}
