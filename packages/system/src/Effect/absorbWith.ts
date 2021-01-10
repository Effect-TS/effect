// tracing: off
import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import { squash } from "../Cause"
import { flow, identity, pipe } from "../Function"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { foldM } from "./foldM"
import { sandbox } from "./sandbox"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @trace 0
 */
export function absorbWith<E>(f: (e: E) => unknown) {
  return <R, A>(fa: Effect<R, E, A>): Effect<R, unknown, A> => absorbWith_(fa, f)
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @trace 1
 */
export function absorbWith_<R, A, E>(fa: Effect<R, E, A>, f: (e: E) => unknown) {
  return pipe(fa, sandbox, foldM(flow(squash(f), fail), succeed))
}

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @trace call
 */
export function absorb<R, E, A>(self: Effect<R, E, A>) {
  const trace = accessCallTrace()
  return absorbWith_(self, traceFrom(trace, identity as (e: E) => unknown))
}
