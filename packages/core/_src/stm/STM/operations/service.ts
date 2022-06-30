/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/stm/STM.Ops service
 */
export function service<T>(tag: Tag<T>): STM<T, never, T> {
  return STM.environmentWith((env) => env.unsafeGet(tag))
}
