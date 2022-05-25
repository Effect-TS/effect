/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/STM/Ops some
 */
export function succeedSome<A>(a: A): USTM<Option<A>> {
  return STM.succeed(Option.some(a))
}
