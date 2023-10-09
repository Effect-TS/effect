/**
 * @since 2.0.0
 */

import * as Equal from "../Equal"
import * as Hash from "../Hash"
import { NodeInspectSymbol, toJSON, toString } from "../Inspectable"
import type * as Option from "../Option"
import { EffectPrototype } from "./Effectable"

const TypeId: Option.TypeId = Symbol.for("effect/Option") as Option.TypeId

const CommonProto = {
  ...EffectPrototype,
  [TypeId]: {
    _A: (_: never) => _
  },
  [NodeInspectSymbol]<A>(this: Option.Option<A>) {
    return this.toJSON()
  },
  toString<A>(this: Option.Option<A>) {
    return toString(this.toJSON())
  }
}

const SomeProto = Object.assign(Object.create(CommonProto), {
  _tag: "Some",
  _op: "Some",
  [Equal.symbol]<A>(this: Option.Some<A>, that: unknown): boolean {
    return isOption(that) && isSome(that) && Equal.equals(that.value, this.value)
  },
  [Hash.symbol]<A>(this: Option.Some<A>) {
    return Hash.combine(Hash.hash(this._tag))(Hash.hash(this.value))
  },
  toJSON<A>(this: Option.Some<A>) {
    return {
      _id: "Option",
      _tag: this._tag,
      value: toJSON(this.value)
    }
  }
})

const NoneProto = Object.assign(Object.create(CommonProto), {
  _tag: "None",
  _op: "None",
  [Equal.symbol]<A>(this: Option.None<A>, that: unknown): boolean {
    return isOption(that) && isNone(that)
  },
  [Hash.symbol]<A>(this: Option.None<A>) {
    return Hash.combine(Hash.hash(this._tag))
  },
  toJSON<A>(this: Option.None<A>) {
    return {
      _id: "Option",
      _tag: this._tag
    }
  }
})

/** @internal */
export const isOption = (input: unknown): input is Option.Option<unknown> =>
  typeof input === "object" && input != null && TypeId in input

/** @internal */
export const isNone = <A>(fa: Option.Option<A>): fa is Option.None<A> => fa._tag === "None"

/** @internal */
export const isSome = <A>(fa: Option.Option<A>): fa is Option.Some<A> => fa._tag === "Some"

/** @internal */
export const none: Option.Option<never> = Object.create(NoneProto)

/** @internal */
export const some = <A>(value: A): Option.Option<A> => {
  const a = Object.create(SomeProto)
  a.value = value
  return a
}
