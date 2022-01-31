// ets_tracing: off

import * as HM from "../../../Collections/Immutable/HashMap/index.js"
import type * as C from "./core.js"
import * as FoldWeighted from "./foldWeighted.js"

/**
 * A sink that collects first `n` keys into a map. The keys are calculated
 * from inputs using the keying function `key`; if multiple inputs use the
 * the same key, they are merged using the `f` function.
 */
export function collectAllToMapN<Err, In, K>(
  n: number,
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): C.Sink<unknown, Err, In, Err, In, HM.HashMap<K, In>> {
  return FoldWeighted.foldWeighted<Err, In, HM.HashMap<K, In>>(
    HM.make(),
    (acc, in_) => (HM.has_(acc, key(in_)) ? 0 : 1),
    n,
    (acc, in_) => {
      const k = key(in_)

      if (HM.has_(acc, k)) {
        return HM.update_(acc, k, (v) => f(v, in_))
      } else {
        return HM.set_(acc, k, in_)
      }
    }
  )
}
