import type { Option } from "../../Classic/Option"
import type * as HKT from "../HKT"

export interface FilterMap<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly filterMap: <A, B>(
    f: (a: A) => Option<B>
  ) => <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, B>
}
