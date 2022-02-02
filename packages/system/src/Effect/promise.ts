// ets_tracing: off

import type { Lazy } from "../Function"
import { pipe } from "../Function"
import { succeed } from "./core"
import { die } from "./die"
import type { IO, UIO } from "./effect"
import { effectAsync } from "./effectAsync"
import { fail } from "./fail"

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function tryCatchPromise<E, A>(
  promise: Lazy<Promise<A>>,
  onReject: (reason: unknown) => E,
  __trace?: string
): IO<E, A> {
  return effectAsync((resolve) => {
    promise()
      .then((x) => pipe(x, succeed, resolve))
      .catch((x) => pipe(x, onReject, fail, resolve))
  }, __trace)
}

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function tryPromise<A>(
  effect: Lazy<Promise<A>>,
  __trace?: string
): IO<unknown, A> {
  return effectAsync((resolve) => {
    effect()
      .then((x) => pipe(x, succeed, resolve))
      .catch((x) => pipe(x, fail, resolve))
  }, __trace)
}

/**
 * Like tryPromise but produces a defect in case of errors
 */
export function promise<A>(effect: Lazy<Promise<A>>, __trace?: string): UIO<A> {
  return effectAsync((resolve) => {
    effect()
      .then((x) => pipe(x, succeed, resolve))
      .catch((x) => pipe(x, die, resolve))
  }, __trace)
}
