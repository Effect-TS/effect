import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Stream } from "../definition"

/**
 * Creates a stream produced from a scoped effect.
 *
 * @tsplus static ets/StreamOps unwrapScoped
 */
export function unwrapScoped<R, E, R1, E1, A>(
  managed: LazyArg<Effect<R & HasScope, E, Stream<R1, E1, A>>>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A> {
  return Stream.scoped(managed).flatten()
}
