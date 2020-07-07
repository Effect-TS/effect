import { pipe } from "../../Function"
import { Sync } from "../Effect/effect"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export const update = <A>(f: (a: A) => A) => (fiberRef: FiberRef<A>): Sync<void> =>
  pipe(
    fiberRef,
    modify((v) => [undefined, f(v)])
  )
