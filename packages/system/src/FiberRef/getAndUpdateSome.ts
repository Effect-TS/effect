// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as O from "../Option/index.js"
import { modify } from "./modify.js"
/**
 * Atomically modifies the `FiberRef` with the specified partial function and
 * returns the old value.
 * If the function is undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = <A>(f: (a: A) => O.Option<A>) =>
  modify<A, A>((v) =>
    Tp.tuple(
      v,
      O.getOrElse_(f(v), () => v)
    )
  )
