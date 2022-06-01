/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/STM/Ops serviceWith
 */
export function serviceWith<T>(tag: Tag<T>) {
  return <A>(f: (a: T) => A): STM<T, never, A> => STM.serviceWithSTM(tag)((a) => STM.succeedNow(f(a)))
}
