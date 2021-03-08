// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import { chain_, effectPartial } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @trace 1
 * @trace 2
 */
export function mapEffect_<R, E1, E, A, B>(
  self: Effect<R, E1, A>,
  f: (a: A) => B,
  onThrow: (u: unknown) => E
) {
  return chain_(self, (a) =>
    effectPartial(
      traceAs(f, () => f(a)),
      onThrow
    )
  )
}

/**
 * Returns an effect whose success is mapped by the specified side effecting
 * `f` function, translating any thrown exceptions into typed failed effects.
 *
 * @dataFirst mapEffect_
 * @trace 0
 * @trace 1
 */
export function mapEffect<E, A, B>(f: (a: A) => B, onThrow: (u: unknown) => E) {
  return <R, E1>(self: Effect<R, E1, A>) => mapEffect_(self, f, onThrow)
}
