import type { IO } from "../definition"
import { Succeed } from "../definition"

/**
 * Constructs a computation that always succeeds with the specified value.
 *
 * @tsplus static ets/IOOps succeedNow
 */
export function succeedNow<A>(a: A): IO<A> {
  return new Succeed(() => a)
}
