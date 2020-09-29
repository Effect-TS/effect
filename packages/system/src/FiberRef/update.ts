import type { UIO } from "../Effect/effect"
import { pipe } from "../Function"
import type { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Atomically modifies the `FiberRef` with the specified function.
 */
export const update = <A>(f: (a: A) => A) => (fiberRef: FiberRef<A>): UIO<void> =>
  pipe(
    fiberRef,
    modify((v) => [undefined, f(v)])
  )
