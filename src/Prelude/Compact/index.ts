import { URIS, Auto, Base, Kind, OrN, OrK, OrX, OrI, OrS, OrR, OrE } from "../HKT"

import { Option } from "@effect-ts/system/Option"

export interface Compact<F extends URIS, C = Auto> extends Base<F, C> {
  readonly compact: <N extends string, K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      F,
      OrN<C, N>,
      OrK<C, K>,
      SI,
      SO,
      OrX<C, X>,
      OrI<C, I>,
      OrS<C, S>,
      OrR<C, R>,
      OrE<C, E>,
      Option<A>
    >
  ) => Kind<
    F,
    OrN<C, N>,
    OrK<C, K>,
    SI,
    SO,
    OrX<C, X>,
    OrI<C, I>,
    OrS<C, S>,
    OrR<C, R>,
    OrE<C, E>,
    A
  >
}
