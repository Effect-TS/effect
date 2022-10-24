/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will be handled using `onReject`.
 *
 * @tsplus static effect/core/io/Effect.Ops tryCatchPromise
 * @category constructors
 * @since 1.0.0
 */
export function tryCatchPromise<E, A>(
  promise: LazyArg<Promise<A>>,
  onReject: (reason: unknown) => E
): Effect<never, E, A> {
  return Effect.tryCatch(promise, onReject).flatMap((promise) =>
    Effect.async<never, E, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeed(a)))
        .catch((e) => resolve(Effect.fail(onReject(e))))
    })
  )
}

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 *
 * @tsplus static effect/core/io/Effect.Ops tryPromise
 */
export function tryPromise<A>(
  promise: LazyArg<Promise<A>>
): Effect<never, unknown, A> {
  return Effect.attempt(promise).flatMap((promise) =>
    Effect.async<never, unknown, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeed(a)))
        .catch((e) => resolve(Effect.fail(e)))
    })
  )
}

/**
 * Like `tryPromise` but produces a defect in case of errors.
 *
 * @tsplus static effect/core/io/Effect.Ops promise
 */
export function promise<A>(
  promise: LazyArg<Promise<A>>
): Effect<never, never, A> {
  return Effect.sync(promise).flatMap((promise) =>
    Effect.async<never, never, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeed(a)))
        .catch((e) => resolve(Effect.die(e)))
    })
  )
}
