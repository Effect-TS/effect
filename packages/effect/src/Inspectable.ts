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
 * @since 3.9.0
 * @category symbols
 */
export const DenoInspectSymbol = Symbol.for("Deno.customInspect")

/**
 * @since 3.9.0
 * @category symbols
 */
export type DenoInspectSymbol = typeof DenoInspectSymbol

/**
 * @since 2.0.0
 * @category models
 */
export interface Inspectable {
  toString(): string
  toJSON(): unknown
  [NodeInspectSymbol](): unknown
  [DenoInspectSymbol](): unknown
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

/**
 * @since 2.0.0
 */
export const BaseProto: Inspectable = {
  toJSON() {
    return toJSON(this)
  },
  [NodeInspectSymbol]() {
    return this.toJSON()
  },
  [DenoInspectSymbol]() {
    return this.toJSON()
  },
  toString() {
    return format(this.toJSON())
  }
}

/**
 * @since 2.0.0
 */
export abstract class Class {
  /**
   * @since 2.0.0
   */
  abstract toJSON(): unknown
  /**
   * @since 2.0.0
   */
  [NodeInspectSymbol]() {
    return this.toJSON()
  }
  /**
   * @since 3.9.0
   */
  [DenoInspectSymbol]() {
    return this.toJSON()
  }
  /**
   * @since 2.0.0
   */
  toString() {
    return format(this.toJSON())
  }
}

/**
 * @since 2.0.0
 */
export const toStringUnknown = (u: unknown, whitespace: number | string | undefined = 2): string => {
  if (typeof u === "string") {
    return u
  }
  try {
    return typeof u === "object" ? stringifyCircular(u, whitespace) : String(u)
  } catch (_) {
    return String(u)
  }
}

/**
 * @since 2.0.0
 */
export const stringifyCircular = (obj: unknown, whitespace?: number | string | undefined): string => {
  let cache: Array<unknown> = []
  const retVal = JSON.stringify(
    obj,
    (_key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // circular reference
          : cache.push(value) && value
        : value,
    whitespace
  )
  ;(cache as any) = undefined
  return retVal
}
