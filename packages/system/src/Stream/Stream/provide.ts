// ets_tracing: off

import type { Stream } from "./definitions.js"
import { provideSome_ } from "./provideSome.js"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide<R>(r: R) {
  return <E, A, R0>(next: Stream<R & R0, E, A>): Stream<R0, E, A> =>
    provideSome_(next, (r0: R0) => ({ ...r0, ...r }))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll<R>(r: R) {
  return <E, A>(self: Stream<R, E, A>) => provideAll_(self, r)
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function provideAll_<E, A, R = unknown>(
  self: Stream<R, E, A>,
  r: R
): Stream<unknown, E, A> {
  return provideSome_(self, () => r)
}
