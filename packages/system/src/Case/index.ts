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
  [CaseBrand]: string[]
}

export function isCase(self: unknown): self is Case<any, any> {
  return typeof self === "object" && self != null && CaseBrand in self
}

const h0 = St.hashString("@effect-ts/system/Case")

export class Case<T, K extends PropertyKey = never>
  implements CaseBrand, St.HasHash, St.HasEquals {
  #args: ConstructorArgs<T, K>
  #keys: string[]
  constructor(args: ConstructorArgs<T, K>) {
    this.#args = args

    if (typeof args === "object" && args != null) {
      const keys = Object.keys(args)

      for (let i = 0; i < keys.length; i++) {
        Object.defineProperty(this, keys[i]!, {
          set(_: unknown) {
            //
          },
          get() {
            return args[keys[i]!]
          },
          enumerable: true
        })
      }
    }
    this.#keys = Object.keys(this).sort()
  }

  copy(args: Partial<ConstructorArgs<T, K>>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.#args, ...args })
  }

  get [CaseBrand](): string[] {
    return this.#keys
  }

  [St.hashSym](): number {
    let h = h0
    for (const k of Object.keys(this).sort()) {
      h = St.combineHash(h, St.hash(this[k]))
    }
    return h
  }

  [St.equalsSym](that: unknown): boolean {
    if (this === that) {
      return true
    }
    if (isCase(that)) {
      const kthat = that[CaseBrand]
      const len = kthat.length

      if (len !== this.#keys.length) {
        return false
      }

      let eq = true
      let i = 0

      while (eq && i < len) {
        eq =
          this.#keys[i] === kthat[i] &&
          St.equals(this[this.#keys[i]!]!, that[kthat[i]!]!)
        i++
      }

      return eq
    }
    return false
  }
}
