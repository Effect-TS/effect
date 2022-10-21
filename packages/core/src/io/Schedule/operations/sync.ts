/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @tsplus static effect/core/io/Schedule.Ops sync
 */
export function sync<A>(a: LazyArg<A>): Schedule<number, never, unknown, A> {
  return Schedule.repeatForever.map(a)
}
