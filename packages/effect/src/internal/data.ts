import * as Equal from "../Equal.js"
import type { LazyArg } from "../Function.js"
import { pipe } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as Hash from "../Hash.js"
import type * as Types from "../Types.js"
import { StructuralPrototype } from "./effectable.js"

/** @internal */
export const ArrayProto: Equal.Equal = Object.assign(Object.create(Array.prototype), {
  [Hash.symbol](this: Array<any>) {
    return Hash.cached(this, Hash.array(this))
  },
  [Equal.symbol](this: Array<any>, that: Equal.Equal) {
    if (Array.isArray(that) && this.length === that.length) {
      return this.every((v, i) => Equal.equals(v, (that as Array<any>)[i]))
    } else {
      return false
    }
  }
})

/** @internal */
export const Structural: new<A>(
  args: Types.Equals<Omit<A, keyof Equal.Equal>, {}> extends true ? void
    : { readonly [P in keyof A as P extends keyof Equal.Equal ? never : P]: A[P] }
) => {} = (function() {
  function Structural(this: any, args: any) {
    if (args) {
      Object.assign(this, args)
    }
  }
  Structural.prototype = StructuralPrototype
  return Structural as any
})()

/** @internal */
export const struct = <As extends Readonly<Record<string, any>>>(as: As): As =>
  Object.assign(Object.create(StructuralPrototype), as)

const deepSymbol = Symbol.for("effect/Data/deep")

const regionalConfig = globalValue("effect/Data/regionalConfig", () => ({ deep: false }))

/** @internal */
export const withDeepEquality = <A>(f: LazyArg<A>): A => {
  try {
    regionalConfig.deep = true
    return f()
  } finally {
    regionalConfig.deep = false
  }
}

/** @internal */
export const proxy = <A>(value: A): A => {
  const useDeep = regionalConfig.deep
  if ((typeof value === "function" || typeof value === "object") && value !== null) {
    let hashCache: any = "INIT"
    return new Proxy(value, {
      has(target, p) {
        if (p === Hash.symbol || p === Equal.symbol || p === deepSymbol) {
          return true
        }
        return p in target
      },
      get(target, p) {
        if (p === deepSymbol) {
          return useDeep
        }
        if (p === Hash.symbol) {
          return () => {
            if (hashCache === "INIT") {
              hashCache = useDeep
                ? deepHash(value)
                : Array.isArray(value)
                ? Hash.array(value)
                : Hash.structure(value)
            }
            return hashCache
          }
        }
        if (p === Equal.symbol) {
          if (useDeep) {
            return deepComp
          }
          if (Array.isArray(value)) {
            return ArrayProto[Equal.symbol]
          } else {
            return StructuralPrototype[Equal.symbol]
          }
        }
        // @ts-expect-error
        return target[p]
      }
    })
  }
  return value
}

function deepHash(value: any) {
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      let h = 6151
      for (let i = 0; i < value.length; i++) {
        h = pipe(h, Hash.combine(deepHash(value[i])))
      }
      return Hash.optimize(h)
    } else {
      const keys = Object.keys(value)
      let h = 12289
      for (let i = 0; i < keys.length; i++) {
        h ^= pipe(Hash.string(keys[i]! as string), Hash.combine(deepHash((value as any)[keys[i]!])))
      }
      return Hash.optimize(h)
    }
  }
  return Hash.hash(value)
}

function deepComp(this: any, that: any) {
  if (typeof that === typeof this && that !== null && this[deepSymbol] === that[deepSymbol]) {
    return deep(this, that)
  }
  return false
}

const deep = (a: any, b: any): boolean => {
  if (a === b) {
    return true
  }
  if (
    ((typeof a === "object" || typeof a === "function") && a !== null) &&
    ((typeof b === "object" || typeof b === "function") && b !== null) &&
    typeof a === typeof b
  ) {
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
      return a.every((v, i) => deep(v, b[i]))
    } else {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length === keysB.length) {
        for (let i = 0; i < keysA.length; i++) {
          const key = keysA[i]
          if (!(key in b)) {
            return false
          }
          if (!deep(a[key], b[key])) {
            return false
          }
        }
        return true
      }
    }
  }
  return false
}
