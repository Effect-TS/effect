/**
 * Returns a successful effect with the head of the list if the list is
 * non-empty or fails with the error `None` if the list is empty.
 *
 * @tsplus getter effect/core/stm/STM head
 */
export function head<R, E, A>(self: STM<R, E, Collection<A>>): STM<R, Maybe<E>, A> {
  return self.foldSTM(
    (x) => STM.fail(Maybe.some(x)),
    (x) => {
      const it = x[Symbol.iterator]()
      const next = it.next()
      return next.done ? STM.fail(Maybe.none) : STM.succeed(next.value)
    }
  )
}
