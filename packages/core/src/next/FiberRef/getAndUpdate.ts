import { pipe } from "../../Function"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function and returns
 * the old value.
 */
export const getAndUpdate = <A>(f: (a: A) => A) => (fiberRef: FiberRef<A>) =>
  pipe(
    fiberRef,
    modify((v) => [v, f(v)])
  )
