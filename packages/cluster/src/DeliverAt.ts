/**
 * @since 1.0.0
 */
import type { DateTime } from "effect/DateTime"
import { hasProperty } from "effect/Predicate"

/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol: unique symbol = Symbol.for("@effect/cluster/DeliverAt")

/**
 * @since 1.0.0
 * @category models
 */
export interface DeliverAt {
  [symbol](): DateTime
}

/**
 * @since 1.0.0
 * @category guards
 */
export const isDeliverAt = (self: unknown): self is DeliverAt => hasProperty(self, symbol)

/**
 * @since 1.0.0
 * @category accessors
 */
export const toMillis = (self: unknown): number | null => {
  if (isDeliverAt(self)) {
    return self[symbol]().epochMillis
  }
  return null
}
