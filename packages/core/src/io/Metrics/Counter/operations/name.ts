import type { Counter } from "../definition"
import { concreteCounter } from "./_internal/InternalCounter"

/**
 * Returns the name of the counter.
 *
 * @tsplus getter ets/Counter name
 */
export function name<A>(self: Counter<A>): string {
  concreteCounter(self)
  return self._name
}
