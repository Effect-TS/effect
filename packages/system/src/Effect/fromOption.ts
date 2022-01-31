// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { IO } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Lifts an `Option` into a `Effect` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromOption<A>(
  o: O.Option<A>,
  __trace?: string
): IO<O.Option<never>, A> {
  return o._tag === "None" ? fail(O.none, __trace) : succeed(o.value, __trace)
}

/**
 * Lifts a nullable value into a `Effect` but preserves the error as an option in the error channel, making it easier to compose
 * in some scenarios.
 */
export function fromNullable<A>(
  o: A,
  __trace?: string
): IO<O.Option<never>, NonNullable<A>> {
  return fromOption(O.fromNullable(o), __trace)
}
