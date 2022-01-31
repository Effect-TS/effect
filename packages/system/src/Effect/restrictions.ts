// ets_tracing: off

import type { Effect, RIO } from "./effect.js"
import type { DefaultEnv } from "./runtime.js"

/**
 * Forces `self` to be non failable
 *
 * @ets_optimize identity
 */
export function unfailable<R, A>(self: Effect<R, never, A>): RIO<R, A> {
  return self
}

/**
 * Forces `self` to be only require `DefaultEnv`
 *
 * @ets_optimize identity
 */
export function onlyDefaultEnv<E, A>(
  self: Effect<DefaultEnv, E, A>
): Effect<DefaultEnv, E, A> {
  return self
}

/**
 * Forces `self` to be not require any environment
 *
 * @ets_optimize identity
 */
export function noEnv<E, A>(self: Effect<unknown, E, A>): Effect<unknown, E, A> {
  return self
}
