import { Either } from "../../../_system/Either"
import { Auto, Kind, OrE, OrI, OrK, OrR, OrS, OrX, URIS, Base } from "../../HKT"

export interface Run<F extends URIS, C = Auto> extends Base<F> {
  readonly run: <K, SI, SO, X, I, S, R, E, A>(
    fa: Kind<
      F,
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
