import * as Option from "@fp-ts/data/Option"

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided effectful function to extract a value out of it.
 *
 * @tsplus static effect/core/stm/TMap.Aspects findSTM
 * @tsplus pipeable effect/core/stm/TMap findSTM
 * @category elements
 * @since 1.0.0
 */
export function findSTM<K, V, R, E, A>(
  f: (kv: readonly [K, V]) => STM<R, Option.Option<E>, A>
) {
  return (self: TMap<K, V>): STM<R, E, Option.Option<A>> =>
    self.foldSTM(Option.none as Option.Option<A>, (a, kv) => {
      if (Option.isNone(a)) {
        return f(kv).foldSTM((option) => {
          switch (option._tag) {
            case "None": {
              return STM.none
            }
            case "Some": {
              return STM.fail(option.value)
            }
          }
        }, STM.some)
      }

      return STM.succeed(a)
    })
}
