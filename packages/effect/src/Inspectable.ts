/**
 * @since 2.0.0
 */

import type { FiberRefs } from "./index.js"
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
   * @since 2.0.0
   */
  toString() {
    return format(this.toJSON())
  }
}

/**
 * @since 2.0.0
 */
export const toStringUnknown = (
  u: unknown,
  whitespace: number | string | undefined = 2,
  context?: FiberRefs.FiberRefs
): string => {
  if (typeof u === "string") {
    return u
  }
  try {
    return typeof u === "object" ? stringifyCircular(u, whitespace, context) : String(u)
  } catch (_) {
    return String(u)
  }
}

export interface Redactable {
  readonly [RedactableId]: (fiberRefs: FiberRefs.FiberRefs) => unknown
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const RedactableId: unique symbol = Symbol.for("@effect/platform/Headers")

export const isRedactable = (u: unknown): u is Redactable => typeof u === "object" && u !== null && RedactableId in u

/**
 * @since 2.0.0
 */
export const stringifyCircular = (
  obj: unknown,
  whitespace?: number | string | undefined,
  context?: FiberRefs.FiberRefs
): string => {
  let cache: Map<unknown, unknown> = new Map()
  const retVal = JSON.stringify(
    obj,
    (_key, value) =>
      typeof value === "object" && value !== null
        ? cache.has(value)
          ? undefined // circular reference
          : (() => {
            const redacted = context && isRedactable(value) ? value[RedactableId](context) : value
            cache.set(value, redacted)
            return redacted
          })()
        : value,
    whitespace
  )
  ;(cache as any) = undefined
  return retVal
}
