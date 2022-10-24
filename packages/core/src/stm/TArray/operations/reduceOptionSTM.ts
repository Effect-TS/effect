import * as Option from "@fp-ts/data/Option"

/**
 * Atomically reduce the non-empty array using a transactional binary
 * operator.
 *
 * @tsplus static effect/core/stm/TArray.Aspects reduceOptionSTM
 * @tsplus pipeable effect/core/stm/TArray reduceOptionSTM
 * @category folding
 * @since 1.0.0
 */
export function reduceOptionSTM<E, A>(f: (x: A, y: A) => STM<never, E, A>) {
  return (self: TArray<A>): STM<never, E, Option.Option<A>> =>
    self.reduceSTM(
      Option.none as Option.Option<A>,
      (option, a) => {
        switch (option._tag) {
          case "None": {
            return STM.some(a)
          }
          case "Some": {
            return f(option.value, a).map(Option.some)
          }
        }
      }
    )
}
