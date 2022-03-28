import type { LazyArg } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import { Stream } from "../definition"

/**
 * Creates a stream produced from a `Managed`.
 *
 * @tsplus static ets/StreamOps unwrapManaged
 */
export function unwrapManaged<R, E, R1, E1, A>(
  managed: LazyArg<Managed<R, E, Stream<R1, E1, A>>>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return Stream.managed(managed).flatten()
}
