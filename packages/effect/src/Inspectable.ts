/**
 * @since 2.0.0
 */
import * as Context from "./Context.js"
import type { RuntimeFiber } from "./Fiber.js"
import { globalValue } from "./GlobalValue.js"
import * as internal from "./internal/inspectable.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const NodeInspectSymbol: unique symbol = internal.NodeInspectSymbol

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
export const toJSON: (x: unknown) => unknown = internal.toJSON

/**
 * @since 2.0.0
 */
export const format: (x: unknown) => string = internal.format

/**
 * @since 2.0.0
 */
export const BaseProto: Inspectable = internal.BaseProto

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
export const toStringUnknown: (u: unknown, whitespace?: number | string | undefined) => string =
  internal.toStringUnknown

/**
 * @since 2.0.0
 */
export const stringifyCircular: (obj: unknown, whitespace?: number | string | undefined) => string =
  internal.stringifyCircular

/**
 * @since 3.10.0
 * @category redactable
 */
export const symbolRedactable: unique symbol = internal.symbolRedactable

/**
 * @since 3.12.0
 * @category redactable
 */
export type symbolRedactable = typeof symbolRedactable

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
export const isRedactable: (u: unknown) => u is Redactable = internal.isRedactable

/**
 * @since 3.10.0
 * @category redactable
 */
export const redact: (u: unknown) => unknown = internal.redact

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
