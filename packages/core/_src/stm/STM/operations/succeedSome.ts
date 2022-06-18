/**
 * Returns an effect with the optional value.
 *
 * @tsplus static ets/STM/Ops some
 */
export function succeedSome<A>(a: A): USTM<Maybe<A>> {
  return STM.succeed(Maybe.some(a))
}
