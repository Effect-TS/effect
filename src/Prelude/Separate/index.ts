import { Auto, Base, Kind, OrE, OrI, OrK, OrN, OrR, OrS, OrX, URIS } from "../HKT"

import { Either } from "@effect-ts/system/Either"
import { Separated } from "@effect-ts/system/Utils"

export interface Separate<F extends URIS, C = Auto> extends Base<F> {
  readonly separate: <N extends string, K, SI, SO, X, I, S, R, E, A, B>(
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
      Either<A, B>
    >
  ) => Separated<
    Kind<
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
    >,
    Kind<
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
      B
    >
  >
}
