/**
 * @since 2.0.0
 */

import type * as Either from "../Either.js"
import * as Equal from "../Equal.js"
import { dual } from "../Function.js"
import * as Hash from "../Hash.js"
import { format, NodeInspectSymbol, toJSON } from "../Inspectable.js"
import type { Option } from "../Option.js"
import { hasProperty } from "../Predicate.js"
import { EffectPrototype } from "./effectable.js"
import * as option from "./option.js"

/**
 * @internal
 */
export const TypeId: Either.TypeId = Symbol.for("effect/Either") as Either.TypeId

const CommonProto = {
  ...EffectPrototype,
  [TypeId]: {
    _A: (_: never) => _
  },
  [NodeInspectSymbol]<E, A>(this: Either.Either<E, A>) {
    return this.toJSON()
  },
  toString<E, A>(this: Either.Left<E, A>) {
    return format(this.toJSON())
  }
}

const RightProto = Object.assign(Object.create(CommonProto), {
  _tag: "Right",
  _op: "Right",
  [Equal.symbol]<E, A>(this: Either.Right<E, A>, that: unknown): boolean {
    return isEither(that) && isRight(that) && Equal.equals(that.right, this.right)
  },
  [Hash.symbol]<E, A>(this: Either.Right<E, A>) {
    return Hash.combine(Hash.hash(this._tag))(Hash.hash(this.right))
  },
  toJSON<E, A>(this: Either.Right<E, A>) {
    return {
      _id: "Either",
      _tag: this._tag,
      right: toJSON(this.right)
    }
  }
})

const LeftProto = Object.assign(Object.create(CommonProto), {
  _tag: "Left",
  _op: "Left",
  [Equal.symbol]<E, A>(this: Either.Left<E, A>, that: unknown): boolean {
    return isEither(that) && isLeft(that) && Equal.equals(that.left, this.left)
  },
  [Hash.symbol]<E, A>(this: Either.Left<E, A>) {
    return Hash.combine(Hash.hash(this._tag))(Hash.hash(this.left))
  },
  toJSON<E, A>(this: Either.Left<E, A>) {
    return {
      _id: "Either",
      _tag: this._tag,
      left: toJSON(this.left)
    }
  }
})

/** @internal */
export const isEither = (input: unknown): input is Either.Either<unknown, unknown> => hasProperty(input, TypeId)

/** @internal */
export const isLeft = <E, A>(ma: Either.Either<E, A>): ma is Either.Left<E, A> => ma._tag === "Left"

/** @internal */
export const isRight = <E, A>(ma: Either.Either<E, A>): ma is Either.Right<E, A> => ma._tag === "Right"

/** @internal */
export const left = <E>(left: E): Either.Either<E, never> => {
  const a = Object.create(LeftProto)
  a.left = left
  return a
}

/** @internal */
export const right = <A>(right: A): Either.Either<never, A> => {
  const a = Object.create(RightProto)
  a.right = right
  return a
}

/** @internal */
export const getLeft = <E, A>(
  self: Either.Either<E, A>
): Option<E> => (isRight(self) ? option.none : option.some(self.left))

/** @internal */
export const getRight = <E, A>(
  self: Either.Either<E, A>
): Option<A> => (isLeft(self) ? option.none : option.some(self.right))

/** @internal */
export const fromOption = dual(
  2,
  <A, E>(self: Option<A>, onNone: () => E): Either.Either<E, A> =>
    option.isNone(self) ? left(onNone()) : right(self.value)
)
