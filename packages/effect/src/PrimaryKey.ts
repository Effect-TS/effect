/**
 * @since 2.0.0
 */

import * as Hash from "./Hash.js"
import { hasProperty } from "./Predicate.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const symbol: unique symbol = Symbol.for("effect/PrimaryKey")

/**
 * @since 2.0.0
 * @category models
 */
export interface PrimaryKey {
  [symbol](): string
}

/**
 * @since 2.0.0
 * @category accessors
 */
export const value = (self: PrimaryKey): string => self[symbol]()

/**
 * @since 3.5.0
 * @category accessors
 */
export const valueOrHash = (u: unknown): string => {
  if (hasProperty(u, symbol)) {
    return value(u as PrimaryKey)
  }
  const hash = Hash.hash(u)
  if (hasProperty(u, "_tag") && typeof u["_tag"] === "string") {
    return `${u["_tag"]}-${hash}`
  }
  return `${hash}`
}
