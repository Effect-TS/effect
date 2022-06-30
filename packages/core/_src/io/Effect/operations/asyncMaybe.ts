/**
 * Imports an asynchronous effect into a pure `Effect` value, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function `Effect<R, E, A> => any` must not be called. Otherwise the callback
 * function must be called at most once.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncMaybe
 */
export function asyncMaybe<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Maybe<Effect<R, E, A>>,
  __tsplusTrace?: string
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
 */
export function asyncMaybeBlockingOn<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Maybe<Effect<R, E, A>>,
  blockingOn: FiberId,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.asyncInterruptBlockingOn(
    (cb) => register(cb).fold(Either.left(Effect.unit), Either.right),
    blockingOn
  )
}
