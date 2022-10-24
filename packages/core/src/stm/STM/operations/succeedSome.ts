import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect with the optional value.
 *
 * @tsplus static effect/core/stm/STM.Ops some
 * @category constructors
 * @since 1.0.0
 */
export function succeedSome<A>(a: A): USTM<Option.Option<A>> {
  return STM.succeed(Option.some(a))
}
