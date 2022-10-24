import * as Option from "@fp-ts/data/Option"

/**
 * Finds the key/value pair matching the specified predicate, and uses the
 * provided function to extract a value out of it.
 *
 * @tsplus static effect/core/stm/TMap.Aspects find
 * @tsplus pipeable effect/core/stm/TMap find
 * @category elements
 * @since 1.0.0
 */
export function find<K, V, A>(pf: (kv: readonly [K, V]) => Option.Option<A>) {
  return (self: TMap<K, V>): STM<never, never, Option.Option<A>> =>
    self.findSTM((kv) => {
      const option = pf(kv)
      switch (option._tag) {
        case "None": {
          return STM.fail(Option.none)
        }
        case "Some": {
          return STM.succeed(option.value)
        }
      }
    })
}
