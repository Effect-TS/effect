import { Effect } from "../../Effect"
import type { HasScope } from "../../Scope"
import type { FiberRef } from "../definition"

/**
 * Returns a managed effect that sets the value associated with the curent
 * fiber to the specified value as its `acquire` action and restores it to its
 * original value as its `release` action.
 *
 * @tsplus fluent ets/FiberRef locallyScoped
 */
export function locallyScoped_<A>(
  self: FiberRef<A>,
  value: A,
  __tsplusTrace?: string
): Effect<HasScope, never, void> {
  return Effect.acquireRelease(
    self.get().flatMap((old) => self.set(value).as(old)),
    (a) => self.set(a)
  ).asUnit()
}

/**
 * Returns a managed effect that sets the value associated with the curent
 * fiber to the specified value as its `acquire` action and restores it to its
 * original value as its `release` action.
 */
export const locallyScoped = Pipeable(locallyScoped_)
