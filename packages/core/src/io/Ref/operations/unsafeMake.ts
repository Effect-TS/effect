import { AtomicReference } from "../../../support/AtomicReference"
import { Atomic } from "../Atomic"

/**
 * @tsplus static ets/RefOps unsafeMake
 */
export function unsafeMake<A>(value: A): Atomic<A> {
  return new Atomic(new AtomicReference(value))
}
