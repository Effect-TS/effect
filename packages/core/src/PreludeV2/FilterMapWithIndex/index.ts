// ets_tracing: off

import type { Option } from "../../Option/index.js"
import type * as HKT from "../HKT/index.js"

export interface FilterMapWithIndex<K, F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly filterMapWithIndex: <A, B>(
    f: (k: K, a: A) => Option<B>
  ) => <X, I, R, E>(fa: HKT.Kind<F, X, I, R, E, A>) => HKT.Kind<F, X, I, R, E, B>
}
