/**
 * @tsplus static effect/core/io/Logger.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<A>(a: A): Logger<unknown, A> {
  return Logger.simple(() => a)
}
