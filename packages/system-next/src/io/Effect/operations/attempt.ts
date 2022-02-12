import type { LazyArg } from "../../../data/Function"
import { Exit } from "../../Exit"
import { Effect, EffectError } from "../definition"

/**
 * Imports a synchronous side-effect into a pure `Effect` value, translating any
 * thrown exceptions into typed failed effects creating with `Effect.fail`.
 *
 * @tsplus static ets/EffectOps attempt
 */
export function attempt<A>(
  f: LazyArg<A>,
  __etsTrace?: string
): Effect<unknown, unknown, A> {
  return Effect.succeedWith((runtimeConfig) => {
    try {
      return f()
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new EffectError(Exit.fail(error), __etsTrace)
      }
      throw error
    }
  })
}

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @tsplus static ets/EffectOps __call
 */
export function applyEffect<A>(
  f: LazyArg<A>,
  __etsTrace?: string
): Effect<unknown, unknown, A> {
  return attempt(f)
}
