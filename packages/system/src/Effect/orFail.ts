// tracing: off

import { identity } from "../Function"
import * as O from "../Option"
import * as T from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function chainOrFail_<E1, A, R2, E2, B, R, E>(
  self: Effect<R, E, A>,
  e: E1,
  f: (a: A) => O.Option<Effect<R2, E2, B>>
) {
  return T.chain_(
    self,
    (a): Effect<R2, E1 | E2, B> => O.fold_(f(a), () => fail(e), identity)
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @dataFirst chainOrFail_
 */
export function chainOrFail<E1, A, R2, E2, B>(
  e: E1,
  f: (a: A) => O.Option<Effect<R2, E2, B>>
) {
  return <R, E>(self: Effect<R, E, A>) => chainOrFail_(self, e, f)
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function mapOrFail_<E1, A, B, R, E>(
  self: Effect<R, E, A>,
  e: E1,
  f: (a: A) => O.Option<B>
) {
  return T.chain_(
    self,
    (a): Effect<unknown, E1, B> => O.fold_(f(a), () => fail(e), T.succeed)
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @dataFirst mapOrFail_
 */
export function mapOrFail<E1, A, B>(e: E1, f: (a: A) => O.Option<B>) {
  return <R, E>(self: Effect<R, E, A>) => mapOrFail_(self, e, f)
}
