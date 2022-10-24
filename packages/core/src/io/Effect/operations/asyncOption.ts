import * as Either from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => any` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncOption
 * @category async
 * @since 1.0.0
 */
export function asyncOption<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>
): Effect<R, E, A> {
  return asyncMaybeBlockingOn(register, FiberId.none)
}

/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => any` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncMaybeBlockingOn
 * @category async
 * @since 1.0.0
 */
export function asyncMaybeBlockingOn<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Option<Effect<R, E, A>>,
  blockingOn: FiberId
): Effect<R, E, A> {
  return Effect.asyncInterruptBlockingOn(
    (cb) => {
      const option = register(cb)
      switch (option._tag) {
        case "None": {
          return Either.left(Effect.unit)
        }
        case "Some": {
          return Either.right(option.value)
        }
      }
    },
    blockingOn
  )
}
