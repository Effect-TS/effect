/**
 * Creates an unbounded hub.
 *
 * @tsplus static effect/core/stm/THub.Ops unbounded
 */
export function unbounded<A>(): USTM<THub<A>> {
  return THub.make(Number.MAX_SAFE_INTEGER, THub.Dropping)
}
