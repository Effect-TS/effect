// tracing: off
import { accessCallTrace, traceCall, traceFrom } from "@effect-ts/tracing-utils"

import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Applicative's ap
 *
 * @dataFirst ap_
 * @trace call
 */
export function ap<R2, E2, A>(
  fa: Effect<R2, E2, A>
): <R, E, B>(fab: Effect<R, E, (a: A) => B>) => Effect<R & R2, E2 | E, B> {
  const trace = accessCallTrace()
  return traceCall((fab) => ap_(fab, fa), trace)
}

/**
 * Applicative's ap
 *
 * @trace call
 */
export function ap_<R, E, B, R2, E2, A>(
  fab: Effect<R, E, (a: A) => B>,
  fa: Effect<R2, E2, A>
): Effect<R & R2, E2 | E, B> {
  const trace = accessCallTrace()
  return chain_(
    fab,
    traceFrom(trace, (ab) => map_(fa, ab))
  )
}
