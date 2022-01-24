import type { LazyArg } from "../../../data/Function"
import type { IO, UIO } from "../definition"
import { async } from "./async"
import { die } from "./die"
import { failNow } from "./failNow"
import { succeedNow } from "./succeedNow"

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will be handled using `onReject`.
 *
 * @ets static ets/EffectOps tryCatchPromise
 */
export function tryCatchPromise<E, A>(
  promise: LazyArg<Promise<A>>,
  onReject: (reason: unknown) => E,
  __etsTrace?: string
): IO<E, A> {
  return async((resolve) => {
    promise()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(failNow(onReject(e))))
  }, __etsTrace)
}

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 *
 * @ets static ets/EffectOps tryPromise
 */
export function tryPromise<A>(
  effect: LazyArg<Promise<A>>,
  __etsTrace?: string
): IO<unknown, A> {
  return async((resolve) => {
    effect()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(fail(e)))
  }, __etsTrace)
}

/**
 * Like `tryPromise` but produces a defect in case of errors.
 *
 * @ets static ets/EffectOps promise
 */
export function promise<A>(effect: LazyArg<Promise<A>>, __etsTrace?: string): UIO<A> {
  return async((resolve) => {
    effect()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(die(e)))
  }, __etsTrace)
}
