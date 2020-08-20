import { Auto, Kind, OrFix, URIS, Base } from "../HKT"

export interface None<F extends URIS, C = Auto> extends Base<F, C> {
  readonly never: <S, SI, SO = SI>() => Kind<
    F,
    OrFix<"N", C, never>,
    OrFix<"K", C, never>,
    SI,
    SO,
    OrFix<"X", C, never>,
    OrFix<"I", C, unknown>,
    OrFix<"S", C, S>,
    OrFix<"R", C, unknown>,
    OrFix<"E", C, never>,
    never
  >
}
