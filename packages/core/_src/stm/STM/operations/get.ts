/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 *
 * @tsplus getter effect/core/stm/STM get
 */
export function get<R, E, A>(self: STM<R, E, Maybe<A>>): STM<R, Maybe<E>, A> {
  return self.foldSTM(
    (x) => STM.failSync(Maybe.some(x)),
    (_) => _.fold(() => STM.failSync(Maybe.none), STM.succeed)
  )
}
