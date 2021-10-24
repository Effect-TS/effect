// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import * as L from "../../../Collections/Immutable/List"
import * as Tp from "../../../Collections/Immutable/Tuple"
import type { Predicate } from "../../../Function"
import { pipe } from "../../../Function"
import type * as C from "./core"
import * as Fold from "./fold"
import * as Map from "./map"

/**
 * Accumulates incoming elements into a chunk as long as they verify predicate `p`.
 */
export function collectAllWhile<Err, In>(
  p: Predicate<In>
): C.Sink<unknown, Err, In, Err, In, CK.Chunk<In>> {
  return pipe(
    Fold.fold<Err, In, Tp.Tuple<[L.List<In>, boolean]>>(
      Tp.tuple(L.empty(), true),
      Tp.get(1),
      ({ tuple: [as, _] }, a) => {
        if (p(a)) {
          return Tp.tuple(L.prepend_(as, a), true)
        } else {
          return Tp.tuple(as, false)
        }
      }
    ),
    Map.map(({ tuple: [is, _] }) => CK.from(L.reverse(is)))
  )
}
