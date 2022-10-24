/**
 * Creates a composite effect that represents this effect followed by another
 * one that may depend on the error produced by this one.
 *
 * @tsplus static effect/core/stm/STM.Aspects flatMapError
 * @tsplus pipeable effect/core/stm/STM flatMapError
 * @category sequencing
 * @since 1.0.0
 */
export function flatMapError<E, R2, E2>(f: (e: E) => STM<R2, never, E2>) {
  return <R, A>(self: STM<R, E, A>): STM<R | R2, E2, A> => self.flipWith((stm) => stm.flatMap(f))
}
