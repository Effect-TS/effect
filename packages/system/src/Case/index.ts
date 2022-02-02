// ets_tracing: off

import * as St from "../Structural/index.js"
import type { IsEqualTo } from "../Utils/index.js"

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
  readonly make: <X extends CaseConstructor>(
    this: X,
    ...args: X extends new (...args: infer R) => any ? R : never
  ) => X extends new (...args: any) => any ? InstanceType<X> : never

  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T & Copy<T>
}

export const caseArgs = Symbol()
export const caseKeys = Symbol()

// @ts-expect-error
export const Case: CaseConstructor = class<T>
  implements CaseBrand, St.HasHash, St.HasEquals
{
  static make<T>(args: T) {
    return new this(args)
  }

  private [caseArgs]: T
  private [caseKeys]: string[]
  constructor(args: T) {
    this[caseArgs] = args

    if (typeof args === "object" && args != null) {
      const keys = Object.keys(args)

      for (let i = 0; i < keys.length; i++) {
        this[keys[i]!] = args[keys[i]!]
      }
    }
    this[caseKeys] = Object.keys(this).sort()
  }

  copy(args: Partial<T>): this {
    // @ts-expect-error
    return new this.constructor({ ...this[caseArgs], ...args })
  }

  get [CaseBrand](): string[] {
    return this[caseKeys]
  }

  get [St.hashSym](): number {
    let h = h0
    for (const k of this[caseKeys]) {
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

      if (len !== this[caseKeys].length) {
        return false
      }

      let eq = true
      let i = 0

      while (eq && i < len) {
        eq =
          this[caseKeys][i] === kthat[i] &&
          St.equals(this[this[caseKeys][i]!]!, that[kthat[i]!]!)
        i++
      }

      return eq
    }
    return false
  }
}

export interface CaseConstructorTagged<Tag extends PropertyKey, K extends PropertyKey> {
  readonly _tag: Tag

  readonly make: <X extends Omit<CaseConstructorTagged<Tag, K>, "new">>(
    this: X,
    ...args: X extends new (...args: infer R) => any ? R : never
  ) => X extends new (...args: any[]) => any ? InstanceType<X> : never

  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T &
    Copy<T> & { readonly [k in K]: Tag }
}

export interface CaseConstructorADT<Y, Tag extends PropertyKey, K extends PropertyKey> {
  readonly _tag: Tag

  readonly make: <X extends Omit<CaseConstructorADT<Y, Tag, K>, "new">>(
    this: X,
    ...args: X extends new (...args: infer R) => any ? R : never
  ) => X extends new (...args: any) => any
    ? InstanceType<X> extends Y
      ? Y
      : InstanceType<X>
    : Y

  new <T>(args: IsEqualTo<T, {}> extends true ? void : T): T &
    Copy<T> & { readonly [k in K]: Tag }
}

export function TaggedADT<X>(): {
  <Tag extends string | symbol>(tag: Tag): CaseConstructorADT<X, Tag, "_tag">
  <Tag extends string | symbol, Key extends string | symbol>(
    tag: Tag,
    key: Key
  ): CaseConstructorADT<X, Tag, Key>
} {
  // @ts-expect-error
  return Tagged
}

export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key: Key
): CaseConstructorTagged<Tag, Key>
export function Tagged<Tag extends PropertyKey>(
  tag: Tag
): CaseConstructorTagged<Tag, "_tag">
export function Tagged<Tag extends string | symbol, Key extends string | symbol>(
  tag: Tag,
  key?: Key
): CaseConstructorTagged<Tag, string> {
  if (key) {
    class X extends Case<{}> {
      static readonly _tag = tag;
      // @ts-expect-error
      readonly [key] = tag
    }
    // @ts-expect-error
    return X
  }
  class X extends Case<{}> {
    static readonly _tag = tag
    readonly _tag = tag
  }

  // @ts-expect-error
  return X
}
