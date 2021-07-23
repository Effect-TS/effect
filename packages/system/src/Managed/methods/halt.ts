// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Trace } from "../../Fiber/tracing"
import * as T from "../deps"
import { fromEffect } from "../fromEffect"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function halt<E>(self: Cause<E>, __trace?: string) {
  return fromEffect(T.halt(self), __trace)
}

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function haltWith<E>(self: (_: () => Trace) => Cause<E>, __trace?: string) {
  return fromEffect(T.haltWith(self, __trace))
}
