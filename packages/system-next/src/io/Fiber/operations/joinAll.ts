import type { IO } from "../../Effect"
import type { Fiber } from "../definition"
import { collectAll } from "./collectAll"
import { join } from "./join"

/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 */
export function joinAll<E>(
  fs: Iterable<Fiber<E, any>>,
  __etsTrace?: string
): IO<E, void> {
  return join(collectAll(fs)).asUnit()
}
