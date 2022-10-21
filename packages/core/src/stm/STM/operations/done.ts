/**
 * Returns a value modelled on provided exit status.
 *
 * @tsplus static effect/core/stm/STM.Ops done
 */
export function done<E, A>(exit: TExit<E, A>): STM<never, E, A> {
  return STM.suspend(done(exit))
}
