import { pipe } from "../Function"
import { Sync } from "../Effect/effect"

import { FiberRef } from "./fiberRef"
import { modify } from "./modify"

/**
 * Sets the value associated with the current fiber.
 */
export const set = <A>(a: A) => (fiberRef: FiberRef<A>): Sync<void> =>
  pipe(
    fiberRef,
    modify((_) => [undefined, a])
  )
