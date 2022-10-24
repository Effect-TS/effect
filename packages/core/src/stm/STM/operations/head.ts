import * as Option from "@fp-ts/data/Option"

/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @tsplus getter effect/core/stm/STM head
 * @category getters
 * @since 1.0.0
 */
export function head<R, E, A>(self: STM<R, E, Iterable<A>>): STM<R, Option.Option<E>, A> {
  return self.foldSTM(
    (x) => STM.fail(Option.some(x)),
    (x) => {
      const it = x[Symbol.iterator]()
      const next = it.next()
      return next.done ? STM.fail(Option.none) : STM.succeed(next.value)
    }
  )
}
