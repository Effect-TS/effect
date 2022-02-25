import type { LazyArg } from "../../../data/Function"
import type { IO, UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will be handled using `onReject`.
 *
 * @tsplus static ets/EffectOps tryCatchPromise
 */
export function tryCatchPromise<E, A>(
  promise: LazyArg<Promise<A>>,
  onReject: (reason: unknown) => E,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.succeed(promise).flatMap((promise) =>
    Effect.async<unknown, E, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeedNow(a)))
        .catch((e) => resolve(Effect.failNow(onReject(e))))
    })
  )
}

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 *
 * @tsplus static ets/EffectOps tryPromise
 */
export function tryPromise<A>(
  promise: LazyArg<Promise<A>>,
  __tsplusTrace?: string
): IO<unknown, A> {
  return Effect.succeed(promise).flatMap((promise) =>
    Effect.async<unknown, unknown, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeedNow(a)))
        .catch((e) => resolve(Effect.failNow(e)))
    })
  )
}

/**
 * Like `tryPromise` but produces a defect in case of errors.
 *
 * @tsplus static ets/EffectOps promise
 */
export function promise<A>(
  promise: LazyArg<Promise<A>>,
  __tsplusTrace?: string
): UIO<A> {
  return Effect.succeed(promise).flatMap((promise) =>
    Effect.async<unknown, never, A>((resolve) => {
      promise
        .then((a) => resolve(Effect.succeedNow(a)))
        .catch((e) => resolve(Effect.dieNow(e)))
    })
  )
}
