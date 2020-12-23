import { traceAs } from "@effect-ts/tracing-utils"

import type { Lazy } from "../Function"
import { flow } from "../Function"
import { succeed } from "./core"
import { die } from "./die"
import type { IO, UIO } from "./effect"
import { effectAsync } from "./effectAsync"
import { fail } from "./fail"

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith_<E, A>(
  promise: Lazy<Promise<A>>,
  onReject: (reason: unknown) => E
): IO<E, A> {
  return effectAsync(
    traceAs(promise, (resolve) => {
      promise().then(flow(succeed, resolve)).catch(flow(onReject, fail, resolve))
    })
  )
}

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will be handled using `onReject`
 */
export function fromPromiseWith<E>(onReject: (reason: unknown) => E) {
  return <A>(effect: Lazy<Promise<A>>): IO<E, A> => fromPromiseWith_(effect, onReject)
}

/**
 * Create an Effect that when executed will construct `promise` and wait for its result,
 * errors will produce failure as `unknown`
 */
export function fromPromise<A>(effect: Lazy<Promise<A>>): IO<unknown, A> {
  return effectAsync(
    traceAs(effect, (resolve) => {
      effect().then(flow(succeed, resolve)).catch(flow(fail, resolve))
    })
  )
}

/**
 * Like fromPromise but produces a defect in case of errors
 */
export function fromPromiseDie<A>(effect: Lazy<Promise<A>>): UIO<A> {
  return effectAsync(
    traceAs(effect, (resolve) => {
      effect().then(flow(succeed, resolve)).catch(flow(die, resolve))
    })
  )
}
