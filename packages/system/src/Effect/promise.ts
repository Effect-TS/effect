// tracing: off

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
export function fromPromiseWith<E, A>(
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
export function fromPromise<A>(
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
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(effect: Lazy<Promise<A>>, __trace?: string): UIO<A> {
  return effectAsync((resolve) => {
    effect()
      .then((x) => pipe(x, succeed, resolve))
      .catch((x) => pipe(x, die, resolve))
  }, __trace)
}
