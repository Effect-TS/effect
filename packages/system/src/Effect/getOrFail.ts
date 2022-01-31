// ets_tracing: off

import { NoSuchElementException } from "../GlobalExceptions/index.js"
import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { IO } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Lifts an Option into an Effect, if the option is not defined it fails with NoSuchElementException.
 */
export function getOrFail<A>(
  v: O.Option<A>,
  __trace?: string
): IO<NoSuchElementException, A> {
  return O.fold_(
    v,
    () => fail(new NoSuchElementException(), __trace),
    (x) => succeed(x, __trace)
  )
}

/**
 * Lifts an Option into a IO, if the option is not defined it fails with Unit.
 */
export function getOrFailUnit<A>(v: O.Option<A>, __trace?: string): IO<void, A> {
  return O.fold_(
    v,
    () => fail(undefined, __trace),
    (a) => succeed(a, __trace)
  )
}
