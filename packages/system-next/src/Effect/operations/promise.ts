import type { Lazy } from "../../Function"
import type { IO, UIO } from "../definition"
import { async } from "./async"
import { die } from "./die"
import { failNow } from "./failNow"
import { succeedNow } from "./succeedNow"

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will be handled using `onReject`.
 */
export function tryCatchPromise<E, A>(
  promise: Lazy<Promise<A>>,
  onReject: (reason: unknown) => E,
  __trace?: string
): IO<E, A> {
  return async((resolve) => {
    promise()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(failNow(onReject(e))))
  }, __trace)
}

/**
 * Create an `Effect` that when executed will construct `promise` and wait for
 * its result, errors will produce failure as `unknown`.
 */
export function tryPromise<A>(
  effect: Lazy<Promise<A>>,
  __trace?: string
): IO<unknown, A> {
  return async((resolve) => {
    effect()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(fail(e)))
  }, __trace)
}

/**
 * Like `tryPromise` but produces a defect in case of errors.
 */
export function promise<A>(effect: Lazy<Promise<A>>, __trace?: string): UIO<A> {
  return async((resolve) => {
    effect()
      .then((a) => resolve(succeedNow(a)))
      .catch((e) => resolve(die(e)))
  }, __trace)
}
