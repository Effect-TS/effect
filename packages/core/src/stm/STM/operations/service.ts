import * as Context from "@fp-ts/data/Context"

/**
 * Accesses the specified service in the environment of the effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static effect/core/stm/STM.Ops service
 * @category environment
 * @since 1.0.0
 */
export function service<T>(tag: Context.Tag<T>): STM<T, never, T> {
  return STM.environmentWith(Context.unsafeGet(tag))
}
