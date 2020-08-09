import { pipe } from "../Function"
import * as O from "../Option"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified partial function and
 * returns the old value.
 * If the function is undefined on the current value it doesn't change it.
 */
export const getAndUpdateSome = <A>(f: (a: A) => O.Option<A>) => (
  fiberRef: FiberRef<A>
) =>
  pipe(
    fiberRef,
    modify((v) => [v, O.getOrElse_(f(v), () => v)])
  )
