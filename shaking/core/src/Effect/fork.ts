import { Effect, SyncR } from "../Support/Common/effect"

import { Fiber, makeFiber } from "./makeFiber"

/**
 * Fork the program described by IO in a separate fiber.
 *
 * This fiber will begin executing once the current fiber releases control of the runloop.
 * If you need to begin the fiber immediately you should use applyFirst(forkIO, shifted)
 * @param io
 * @param name
 */
export function fork<S, R, E, A>(
  io: Effect<S, R, E, A>,
  name?: string
): SyncR<R, Fiber<E, A>> {
  return makeFiber(io, name)
}
