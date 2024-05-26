import * as Equal from "../Equal.js"
import { pipe } from "../Function.js"
import * as Hash from "../Hash.js"
import type * as Hidden from "../Hidden.js"
import { pipeArguments } from "../Pipeable.js"
import { hasProperty } from "../Predicate.js"

/** @internal */
const HiddenSymbolKey = "effect/Hidden"

/** @internal */
export const hiddenRegistry = new WeakMap<Hidden.Hidden<any>, any>()

/** @internal */
export const HiddenTypeId: Hidden.HiddenTypeId = Symbol.for(
  HiddenSymbolKey
) as Hidden.HiddenTypeId

/** @internal */
export const proto = {
  [HiddenTypeId]: {
    _A: (_: never) => _
  },
  pipe() {
    return pipeArguments(this, arguments)
  },
  [Hash.symbol]<T>(this: Hidden.Hidden<T>): number {
    return pipe(
      Hash.hash(HiddenSymbolKey),
      Hash.combine(Hash.hash(hiddenRegistry.get(this))),
      Hash.cached(this)
    )
  },
  [Equal.symbol]<T>(this: Hidden.Hidden<T>, that: unknown): boolean {
    return isHidden(that) && Equal.equals(hiddenRegistry.get(this), hiddenRegistry.get(that))
  }
}

/** @internal */
export const isHidden = (u: unknown): u is Hidden.Hidden<unknown> => hasProperty(u, HiddenTypeId)

/** @internal */
export const make = <T>(value: T): Hidden.Hidden<T> => {
  const hidden = Object.create(proto)
  Object.defineProperty(hidden, "toString", {
    enumerable: false,
    value() {
      return "<hidden>"
    }
  })
  Object.defineProperty(hidden, "toJSON", {
    enumerable: false,
    value() {
      return "<hidden>"
    }
  })
  hiddenRegistry.set(hidden, value)
  return hidden
}

/** @internal */
export const value = <T>(self: Hidden.Hidden<T>): T => hiddenRegistry.get(self)

/** @internal */
export const unsafeWipe = <T>(self: Hidden.Hidden<T>): boolean => hiddenRegistry.delete(self)
