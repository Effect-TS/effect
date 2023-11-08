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

import type { Inspectable } from "./Inspectable.js"

export declare namespace Inspectable {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Inspectable.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Inspectable {
    readonly toString: () => string
    readonly toJSON: () => unknown
    readonly [NodeInspectSymbol]: () => unknown
  }
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
export const toString = (x: unknown): string => JSON.stringify(x, null, 2)
