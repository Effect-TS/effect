import type { Reservation } from "../Managed"
import { makeReserve, use_ } from "../Managed"
import type { Effect } from "./effect"

/**
 * Acquires a resource, uses the resource, and then releases the resource.
 * However, unlike `bracket`, the separation of these phases allows
 * the acquisition to be interruptible.
 *
 * Useful for concurrent data structures and other cases where the
 * 'deallocator' can tell if the allocation succeeded or not just by
 * inspecting internal / external state.
 */
export function reserve<R3, E3, B, A>(use: (a: A) => Effect<R3, E3, B>) {
  return <R, E, R2, E2>(reservation: Effect<R, E, Reservation<R2, E2, A>>) =>
    reserve_(reservation, use)
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
  use: (a: A) => Effect<R3, E3, B>
) {
  return use_(makeReserve(reservation), use)
}
