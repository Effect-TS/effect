// ets_tracing: off

import { Fail } from "../../Cause"
import type { LazyArg } from "../../Function"
import { none } from "../../Trace"
import type { IO } from "../definition"
import { failCauseWith } from "./failCauseWith"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 */
export function fail<E>(f: LazyArg<E>, __trace?: string): IO<E, never> {
  return failCauseWith(() => new Fail(f(), none), __trace)
}
