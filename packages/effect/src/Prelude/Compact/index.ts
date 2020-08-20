import { URIS, Auto, Base, Kind, OrFix } from "../HKT"

import { Option } from "@effect-ts/system/Option"

export interface Compact<F extends URIS, C = Auto> extends Base<F, C> {
  readonly compact: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      F,
      OrFix<"N", C, N>,
      OrFix<"K", C, K>,
      SI,
      SO,
      OrFix<"X", C, X>,
      OrFix<"I", C, I>,
      OrFix<"S", C, S>,
      OrFix<"R", C, R>,
      OrFix<"E", C, E>,
      Option<A>
    >
  ) => Kind<
    F,
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
