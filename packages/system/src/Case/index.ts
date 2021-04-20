// tracing: off

import * as St from "../Structural"
import type { Compute } from "../Utils"

export type ConstructorArgs<T, K extends PropertyKey> = Compute<
  {} extends Omit<T, "copy" | "toJSON" | "toString" | symbol | K>
    ? void
    : Omit<T, "copy" | "toJSON" | "toString" | symbol | K>,
  "flat"
>

export const CaseBrand = Symbol()

export interface CaseBrand {
  [CaseBrand](): void
}

export function isCase(self: unknown): self is Case<any, any> {
  return typeof self === "object" && self != null && CaseBrand in self
}

const h0 = St.hashString("@effect-ts/system/Case")

export class Case<T, K extends PropertyKey = never>
  implements CaseBrand, St.HasHash, St.HasEquals {
  #args: ConstructorArgs<T, K>

  constructor(args: ConstructorArgs<T, K>) {
    this.#args = args

    Object.assign(this, args)

    const keys = Object.keys(this)

    for (let i = 0; i < keys.length; i++) {
      const k = this[keys[i]!]
      Object.defineProperty(this, keys[i]!, {
        set(_: unknown) {
          //
        },
        get() {
          return k
        }
      })
    }
  }

  copy(args: Partial<ConstructorArgs<T, K>>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.#args, ...args })
  }

  [CaseBrand]() {
    //
  }

  [St.hashSym](): number {
    let h = h0
    for (const k of Object.keys(this).sort()) {
      h = St.combineHash(h, St.hash(this[k]))
    }
    return h
  }

  [St.equalsSym](that: unknown): boolean {
    if (isCase(that)) {
      const kthis = Object.keys(this)
      const kthat = Object.keys(that)
      const len = kthat.length

      if (len !== kthis.length) {
        return false
      }

      const sthis = kthis.sort()
      const sthat = kthat.sort()

      let eq = true
      let i = 0

      while (eq && i < len) {
        eq = sthis[i] === sthat[i] && St.equals(this[sthis[i]!]!, that[sthat[i]!]!)
        i++
      }

      return eq
    }
    return false
  }
}
