/**
 * @tsplus static effect/core/io/Logger.Ops sync
 */
export function sync<A>(a: LazyArg<A>): Logger<unknown, A> {
  return Logger.simple(a)
}
