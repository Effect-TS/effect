/**
 * Creates an unbounded hub.
 *
 * @tsplus static effect/core/stm/THub.Ops unbounded
 * @category constructors
 * @since 1.0.0
 */
export function unbounded<A>(): USTM<THub<A>> {
  return THub.make(Number.MAX_SAFE_INTEGER, THub.Dropping)
}
