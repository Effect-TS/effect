/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/Effect/Ops serviceWith
 */
export function serviceWith<T>(tag: Tag<T>) {
  return <A>(f: (a: T) => A, __tsplusTrace?: string): Effect<T, never, A> =>
    Effect.serviceWithEffect(tag)((a) => Effect.succeedNow(f(a)))
}
