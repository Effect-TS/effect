// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as HM from "../../../Collections/Immutable/HashMap/index.js"
import type * as C from "./core.js"
import * as FoldLeftChunks from "./foldLeftChunks.js"

/**
 * A sink that collects all of its inputs into a map. The keys are extracted from inputs
 * using the keying function `key`; if multiple inputs use the same key, they are merged
 * using the `f` function.
 */
export function collectAllToMap<Err, In, K>(
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): C.Sink<unknown, Err, In, Err, unknown, HM.HashMap<K, In>> {
  return FoldLeftChunks.foldLeftChunks<Err, In, HM.HashMap<K, In>>(
    HM.make(),
    (acc, as) =>
      CK.reduce_(as, acc, (acc, a) => {
        const k = key(a)

        if (HM.has_(acc, k)) {
          return HM.update_(acc, k, (v) => f(v, a))
        } else {
          return HM.set_(acc, k, a)
        }
      })
  )
}
