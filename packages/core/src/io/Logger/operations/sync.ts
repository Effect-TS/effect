/**
 * @tsplus static effect/core/io/Logger.Ops sync
 * @category constructors
 * @since 1.0.0
 */
export function sync<A>(a: LazyArg<A>): Logger<unknown, A> {
  return Logger.simple(a)
}
