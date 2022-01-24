import type { LazyArg } from "../../../data/Function"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 */
export function fail<E>(
  error: LazyArg<E>,
  __trace?: string
): Managed<unknown, E, never> {
  return fromEffect(T.fail(error, __trace))
}
