/**
 * STMfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/STM/Ops serviceWithSTM
 */
export function serviceWithSTM<T>(service: Service<T>) {
  return <R, E, A>(f: (a: T) => STM<R, E, A>): STM<R & Has<T>, E, A> => STM.service(service).flatMap(f);
}
