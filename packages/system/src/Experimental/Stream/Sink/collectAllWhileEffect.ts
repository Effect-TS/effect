// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as L from "../../../Collections/Immutable/List/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import type * as C from "./core.js"
import * as FoldEffect from "./foldEffect.js"
import * as Map from "./map.js"

/**
 * Accumulates incoming elements into a chunk as long as they verify effectful predicate `p`.
 */
export function collectAllWhileEffect<Env, Err, In>(
  p: (in_: In) => T.Effect<Env, Err, boolean>
): C.Sink<Env, Err, In, Err, In, CK.Chunk<In>> {
  return pipe(
    FoldEffect.foldEffect<Env, Err, In, Tp.Tuple<[L.List<In>, boolean]>>(
      Tp.tuple(L.empty(), true),
      Tp.get(1),
      ({ tuple: [as, _] }, a) =>
        T.map_(p(a), (_) => {
          if (_) {
            return Tp.tuple(L.prepend_(as, a), true)
          } else {
            return Tp.tuple(as, false)
          }
        })
    ),
    Map.map(({ tuple: [is, _] }) => CK.from(L.reverse(is)))
  )
}
