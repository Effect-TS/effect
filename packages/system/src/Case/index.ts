// tracing: off

import * as St from "../Structural"
import type { IsEqualTo } from "../Utils"

export const CaseBrand = Symbol()

export interface CaseBrand {
  [CaseBrand]: string[]
}

export function hasCaseBrand(self: unknown): self is CaseBrand {
  return typeof self === "object" && self != null && CaseBrand in self
}

const h0 = St.hashString("@effect-ts/system/Case")

export interface Copy<T> {
  copy(args: IsEqualTo<T, {}> extends true ? void : Partial<T>): this
}

export interface CaseConstructor {
  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T & Copy<T>
}

// @ts-expect-error
export const Case: CaseConstructor = class<T>
  implements CaseBrand, St.HasHash, St.HasEquals
{
  #args: T
  #keys: string[]
  constructor(args: T) {
    this.#args = args

    if (typeof args === "object" && args != null) {
      const keys = Object.keys(args)

      for (let i = 0; i < keys.length; i++) {
        this[keys[i]!] = args[keys[i]!]
      }
    }
    this.#keys = Object.keys(this).sort()
  }

  copy(args: Partial<T>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.#args, ...args })
  }

  get [CaseBrand](): string[] {
    return this.#keys
  }

  get [St.hashSym](): number {
    let h = h0
    for (const k of this.#keys) {
      h = St.combineHash(h, St.hash(this[k]))
    }
    return h
  }

  [St.equalsSym](that: unknown): boolean {
    if (this === that) {
      return true
    }
    if (that instanceof this.constructor) {
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

export interface CaseConstructorTagged<
  Tag extends string | symbol,
  K extends string | symbol
> {
  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T &
    Copy<T> &
    { readonly [k in K]: Tag }
}

export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key: Key
): CaseConstructorTagged<Tag, Key>
export function Tagged<Tag extends string | symbol>(
  tag: Tag
): CaseConstructorTagged<Tag, "_tag">
export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key?: Key
): CaseConstructorTagged<Tag, string> {
  if (key) {
    class X extends Case<{}> {
      // @ts-expect-error
      readonly [key] = tag
    }
    // @ts-expect-error
    return X
  }
  class X extends Case<{}> {
    readonly _tag = tag
  }

  // @ts-expect-error
  return X
}
