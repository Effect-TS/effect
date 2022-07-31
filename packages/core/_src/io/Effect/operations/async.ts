/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `Effect<R, E, A> => any` must be called at most once.
 *
 * @tsplus static effect/core/io/Effect.Ops async
 */
export function _async<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => void
): Effect<R, E, A> {
  return asyncBlockingOn(register, FiberId.none)
}

export { _async as async }

/**
 * Imports an asynchronous side-effect into a pure `Effect` value. See
 * `asyncMaybe` for the more expressive variant of this function that can
 * return a value synchronously.
 *
 * The callback function `Effect<R, E, A> => any` must be called at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 *
 * @tsplus static effect/core/io/Effect.Ops asyncBlockingOn
 */
export function asyncBlockingOn<R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => void,
  blockingOn: FiberId
): Effect<R, E, A> {
  return Effect.asyncMaybeBlockingOn((cb) => {
    register(cb)
    return Maybe.none
  }, blockingOn)
}
