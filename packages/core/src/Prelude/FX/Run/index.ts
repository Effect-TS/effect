/**
 * @since 1.0.0
 */
import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base, OrN } from "../../HKT"

import { Either } from "@effect-ts/system/Either"

/**
 * @since 1.0.0
 */
export interface Run<F extends URIS, C = Auto> extends Base<F> {
  readonly run: <N extends string, K, SI, SO, X, I, S, R, E, A>(
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
      A
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
    OrE<C, never>,
    Either<OrE<C, E>, A>
  >
}
