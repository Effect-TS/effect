// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { modify } from "./modify.js"
/**
 * Atomically modifies the `FiberRef` with the specified function and returns
 * the old value.
 */
export const getAndUpdate = <A>(f: (a: A) => A) =>
  modify<A, A>((v) => Tp.tuple(v, f(v)))
