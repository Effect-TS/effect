import type { UIO } from "../Effect/effect"
import { pipe } from "../Function"
import type { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Sets the value associated with the current fiber.
 */
export const set = <A>(a: A) => (fiberRef: FiberRef<A>): UIO<void> =>
  pipe(
    fiberRef,
    modify((_) => [undefined, a])
  )
