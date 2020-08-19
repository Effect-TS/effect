import { Identity } from "../../Classic/Identity"
import {
  Base,
  Kind,
  URIS,
  Auto,
  OrN,
  OrK,
  OrX,
  OrI,
  OrS,
  OrR,
  OrE,
  IndexFor
} from "../HKT"

export interface FoldMapWithIndex<F extends URIS, C = Auto> extends Base<F, C> {
  readonly foldMapWithIndex: FoldMapWithIndexFn<F, C>
}

export interface FoldMapWithIndexFn<F extends URIS, C = Auto> {
  <M>(I: Identity<M>): <N extends string, K, A>(
    f: (k: IndexFor<F, OrN<C, N>, OrK<C, K>>, a: A) => M
  ) => <SI, SO, X, I, S, R, E>(
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
