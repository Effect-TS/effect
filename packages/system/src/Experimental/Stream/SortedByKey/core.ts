// ets_tracing: off

import type * as Tp from "../../../Collections/Immutable/Tuple"
import type * as C from "../_internal/core.js"

export type SortedByKey<R, E, K, A> = C.Stream<R, E, Tp.Tuple<[K, A]>>
