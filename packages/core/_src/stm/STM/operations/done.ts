/**
 * Returns a value modelled on provided exit status.
 *
 * @tsplus static ets/STM/Ops done
 */
export function done<E, A>(exit: LazyArg<TExit<E, A>>): STM<unknown, E, A> {
  return STM.suspend(done(exit));
}
