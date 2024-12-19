/**
 * @since 2.0.0
 */
import * as Context from "./Context.js"
import type { RuntimeFiber } from "./Fiber.js"
import { globalValue } from "./GlobalValue.js"
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
  try {
    if (
      hasProperty(x, "toJSON") && isFunction(x["toJSON"]) &&
      x["toJSON"].length === 0
    ) {
      return x.toJSON()
    } else if (Array.isArray(x)) {
      return x.map(toJSON)
    }
  } catch (_) {
    return {}
  }
  return redact(x)
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
          : cache.push(value) && (isRedactable(value) ? redact(value) : value)
        : value,
    whitespace
  )
  ;(cache as any) = undefined
  return retVal
}

/**
 * @since 3.10.0
 * @category redactable
 */
export const symbolRedactable: unique symbol = Symbol.for("effect/Inspectable/Redactable")

/**
 * @since 3.10.0
 * @category redactable
 */
export interface Redactable {
  [symbolRedactable](): unknown
}

/**
 * @since 3.10.0
 * @category redactable
 */
export const isRedactable = (u: unknown): u is Redactable =>
  typeof u === "object" && u !== null && symbolRedactable in u

/**
 * @since 3.10.0
 * @category redactable
 */
export const redact = (u: unknown): unknown => {
  return isRedactable(u) ? u[symbolRedactable]() : u
}

const redactableContext = globalValue("effect/Inspectable/redactableContext", () => new WeakMap<any, any>())

/**
 * @since 3.12.0
 * @category redactable
 */
export const makeRedactableContext = <A>(make: (context: Context.Context<never>) => A): {
  readonly register: (self: unknown, context?: Context.Context<never>, input?: unknown) => void
  readonly get: (u: unknown) => A
} => ({
  register(self, context, input) {
    if (input && redactableContext.has(input)) {
      redactableContext.set(self, redactableContext.get(input))
      return
    }
    redactableContext.set(self, make(context ?? currentContext() ?? Context.empty()))
  },
  get(u) {
    return redactableContext.has(u) ? redactableContext.get(u) : make(currentContext() ?? Context.empty())
  }
})

/**
 * @since 3.12.0
 * @category redactable
 */
export const RedactableClass = <Self>() =>
<A>(options: {
  readonly context: (fiberRefs: Context.Context<never>) => A
  readonly redact: (self: Self, context: A) => unknown
}): new(context?: Context.Context<never>, input?: unknown) => Redactable => {
  const redactable = makeRedactableContext(options.context)
  function Redactable(this: any, context?: Context.Context<never>, input?: unknown) {
    redactable.register(this, context, input)
  }
  Redactable.prototype[symbolRedactable] = function() {
    return options.redact(this, redactable.get(this))
  }
  return Redactable as any
}

const currentContext = (): Context.Context<never> | undefined => {
  const fiber = (globalThis as any)["effect/FiberCurrent"] as RuntimeFiber<any> | undefined
  return fiber ? fiber.currentContext : undefined
}
