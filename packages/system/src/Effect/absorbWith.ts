// ets_tracing: off

import { squash } from "../Cause/index.js"
import { identity, pipe } from "../Function/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"
import { sandbox } from "./sandbox.js"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(fa: Effect<R, E, A>): Effect<R, unknown, A> =>
    absorbWith_(fa, f, __trace)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorbWith_<R, A, E>(
  fa: Effect<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
) {
  return foldM_(sandbox(fa), (x) => pipe(x, squash(f), fail), succeed, __trace)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 */
export function absorb<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return absorbWith_(self, identity, __trace)
}
