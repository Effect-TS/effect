import { Identity } from "../../Classic/Identity"
import { Base, Kind, URIS, Auto, OrN, OrK, OrX, OrI, OrS, OrR, OrE } from "../HKT"

export interface FoldMap<F extends URIS, C = Auto> extends Base<F> {
  readonly foldMap: FoldMapFn<F, C>
}

export interface FoldMapFn<F extends URIS, C = Auto> {
  <M>(I: Identity<M>): <A>(
    f: (a: A) => M
  ) => <N extends string, K, SI, SO, X, I, S, R, E>(
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
  ) => M
}
