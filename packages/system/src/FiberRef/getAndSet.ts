// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple"
import { modify } from "./modify"

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 */
export const getAndSet = <A>(a: A) => modify<A, A>((v) => Tp.tuple(v, a))
