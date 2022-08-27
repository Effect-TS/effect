/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/stm/STM.Ops serviceWith
 */
export function serviceWith<T, A>(tag: Tag<T>, f: (a: T) => A): STM<T, never, A> {
  return STM.serviceWithSTM(tag)((a) => STM.sync(f(a)))
}
