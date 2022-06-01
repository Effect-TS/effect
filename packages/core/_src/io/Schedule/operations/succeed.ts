/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @tsplus static ets/Schedule/Ops succeed
 */
export function succeed<A>(
  a: LazyArg<A>
): Schedule<number, never, unknown, A> {
  return Schedule.forever.map(a)
}
