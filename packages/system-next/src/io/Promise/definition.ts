import type { AtomicReference } from "../../support/AtomicReference"
import type { FiberId } from "../FiberId"
import type { PromiseState } from "./_internal/state"

/**
 * A promise represents an asynchronous variable that can be set exactly once,
 * with the ability for an arbitrary number of fibers to suspend (by calling
 * `await`) and automatically resume when the variable is set.
 *
 * Promises can be used for building primitive actions whose completions require
 * the coordinated action of multiple fibers, and for building higher-level
 * concurrent or asynchronous structures.
 *
 * @tsplus type ets/Promise
 */
export interface Promise<E, A> {
  readonly state: AtomicReference<PromiseState<E, A>>
  readonly blockingOn: FiberId
}

/**
 * @tsplus type ets/PromiseOps
 */
export interface PromiseOps {}
export const Promise: PromiseOps = {}
