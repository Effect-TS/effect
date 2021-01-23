import type { Cause } from "../../Cause"
import * as T from "../deps"
import { fromEffect } from "../fromEffect"

/**
 * Returns an effect that models failure with the specified `Cause`.
 */
export function halt<E>(self: Cause<E>) {
  return fromEffect(T.halt(self))
}
