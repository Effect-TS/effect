import { pipe } from "../../Function"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Atomically sets the value associated with the current fiber and returns
 * the old value.
 */
export const getAndSet = <A>(a: A) => (fiberRef: FiberRef<A>) =>
  pipe(
    fiberRef,
    modify((v) => [v, a])
  )
