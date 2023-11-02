/**
 * @since 2.0.0
 */

import { hasProperty } from "./Predicate"

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
  readonly toString: () => string
  readonly toJSON: () => unknown
  readonly [NodeInspectSymbol]: () => unknown
}

/**
 * @since 2.0.0
 */
export const toJSON = (x: unknown): unknown => {
  if (
    hasProperty(x, "toJSON") && typeof x["toJSON"] === "function" &&
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
export const toString = (x: unknown): string => JSON.stringify(x, null, 2)
