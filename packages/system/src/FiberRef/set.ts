// ets_tracing: off

import type { IO } from "../Effect/effect.js"
import type { XFiberRef } from "./fiberRef.js"

/**
 * Sets the value associated with the current fiber.
 *
 * @ets_data_first set_
 */
export function set<A>(a: A) {
  return <EA, EB>(fiberRef: XFiberRef<EA, EB, A, A>): IO<EA, void> => set_(fiberRef, a)
}

/**
 * Sets the value associated with the current fiber.
 */
export function set_<EA, EB, A>(fiberRef: XFiberRef<EA, EB, A, A>, a: A): IO<EA, void> {
  return fiberRef.set(a)
}
