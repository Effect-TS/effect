import type * as Api from "../Inspectable.js"
import { hasProperty, isFunction } from "../Predicate.js"

/** @internal */
export const NodeInspectSymbol: Api.NodeInspectSymbol = Symbol.for(
  "nodejs.util.inspect.custom"
) as Api.NodeInspectSymbol

/** @internal */
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

/** @internal */
export const format = (x: unknown): string => JSON.stringify(x, null, 2)

/** @internal */
export const BaseProto: Api.Inspectable = {
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

/** @internal */
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

/** @internal */
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

/** @internal */
export const symbolRedactable: Api.symbolRedactable = Symbol.for(
  "effect/Inspectable/Redactable"
) as Api.symbolRedactable

/** @internal */
export const isRedactable = (u: unknown): u is Api.Redactable =>
  typeof u === "object" && u !== null && symbolRedactable in u

/** @internal */
export const redact = (u: unknown): unknown => {
  return isRedactable(u) ? u[symbolRedactable]() : u
}
