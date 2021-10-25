// ets_tracing: off

import type * as GB from "../../GroupBy"
import type * as C from "../core"
import * as ChainPar from "./chainPar"
import * as FlattenExitOption from "./flattenExitOption"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown"

export function mergeGroupBy_<R, R1, E, E1, K, V, A>(
  self: GB.GroupBy<R, E, K, V>,
  f: (k: K, stream: C.IO<E, V>) => C.Stream<R1, E1, A>
): C.Stream<R & R1, E | E1, A> {
  return ChainPar.chainPar_(
    self.grouped,
    Number.MAX_SAFE_INTEGER,
    ({ tuple: [k, q] }) =>
      f(
        k,
        FlattenExitOption.flattenExitOption(
          FromQueueWithShutdown.fromQueueWithShutdown_(q)
        )
      )
  )
}

/**
 * @ets_data_first mergeGroupBy_
 */
export function mergeGroupBy<R1, E, E1, K, V, A>(
  f: (k: K, stream: C.IO<E, V>) => C.Stream<R1, E1, A>
) {
  return <R>(self: GB.GroupBy<R, E, K, V>) => mergeGroupBy_(self, f)
}
