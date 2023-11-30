/**
 * @since 2.0.0
 */

import { hasProperty, isFunction } from "./Predicate.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const NodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom")

/**
 * @since 2.0.0
 * @category symbols
 */
export type NodeInspectSymbol = typeof NodeInspectSymbol

/**
 * @since 2.0.0
 * @category models
 */
export interface Inspectable {
  toString(): string
  toJSON(): unknown
  [NodeInspectSymbol](): unknown
}

/**
 * @since 2.0.0
 */
export const toJSON = (x: unknown): unknown => {
  if (
    hasProperty(x, "toJSON") && isFunction(x["toJSON"]) &&
    x["toJSON"].length === 0
  ) {
    return x.toJSON()
  } else if (Array.isArray(x)) {
    return x.map(toJSON)
  }
  return x
}

/**
 * @since 2.0.0
 */
export const format = (x: unknown): string => JSON.stringify(x, null, 2)
