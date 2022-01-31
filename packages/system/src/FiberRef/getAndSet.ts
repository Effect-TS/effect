// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { modify } from "./modify.js"

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 */
export const getAndSet = <A>(a: A) => modify<A, A>((v) => Tp.tuple(v, a))
