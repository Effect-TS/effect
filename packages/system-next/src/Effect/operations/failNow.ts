import { Fail } from "../../Cause"
import { none } from "../../Trace"
import type { IO } from "../definition"
import { failCause } from "./failCause"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 */
export function failNow<E>(e: E, __trace?: string): IO<E, never> {
  return failCause(new Fail(e, none), __trace)
}
