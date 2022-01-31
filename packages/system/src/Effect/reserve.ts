// ets_tracing: off

import { makeReserve } from "../Managed/core.js"
import type { Reservation } from "../Managed/index.js"
import { use_ } from "../Managed/use.js"
import type { Effect } from "./effect.js"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * However, unlike `bracket`, the separation of these phases allows
 * the acquisition to be interruptible.
 *
 * Useful for concurrent data structures and other cases where the
 * 'deallocator' can tell if the allocation succeeded or not just by
 * inspecting internal / external state.
 *
 * @ets_data_first reserve_
 */
export function reserve<R3, E3, B, A>(
  use: (a: A) => Effect<R3, E3, B>,
  __trace?: string
) {
  return <R, E, R2, E2>(reservation: Effect<R, E, Reservation<R2, E2, A>>) =>
    reserve_(reservation, use, __trace)
}

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * However, unlike `bracket`, the separation of these phases allows
 * the acquisition to be interruptible.
 *
 * Useful for concurrent data structures and other cases where the
 * 'deallocator' can tell if the allocation succeeded or not just by
 * inspecting internal / external state.
 */
export function reserve_<R, E, R2, E2, R3, E3, B, A>(
  reservation: Effect<R, E, Reservation<R2, E2, A>>,
  use: (a: A) => Effect<R3, E3, B>,
  __trace?: string
) {
  return use_(makeReserve(reservation), use, __trace)
}
