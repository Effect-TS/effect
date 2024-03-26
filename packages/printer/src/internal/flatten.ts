import * as Equal from "effect/Equal"
import { dual } from "effect/Function"
import * as Hash from "effect/Hash"
import type * as Flatten from "../Flatten.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const FlattenSymbolKey = "@effect/printer/Flatten"

/** @internal */
export const FlattenTypeId: Flatten.FlattenTypeId = Symbol.for(
  FlattenSymbolKey
) as Flatten.FlattenTypeId

const protoHash = {
  Flattened: (self: Flatten.Flattened<any>) => Hash.combine(Hash.hash(self.value))(Hash.string(FlattenSymbolKey)),
  AlreadyFlat: (_: Flatten.AlreadyFlat<any>) =>
    Hash.combine(Hash.string("@effect/printer/Flattened/AlreadyFlat"))(
      Hash.string(FlattenSymbolKey)
    ),
  NeverFlat: (_: Flatten.AlreadyFlat<any>) =>
    Hash.combine(Hash.string("@effect/printer/Flattened/NeverFlat"))(Hash.string(FlattenSymbolKey))
}

const protoEqual = {
  Flattened: (self: Flatten.Flattened<any>, that: unknown) =>
    isFlatten(that) && that._tag === "Flattened" && Equal.equals(self.value, that.value),
  AlreadyFlat: (_: Flatten.AlreadyFlat<any>, that: unknown) => isFlatten(that) && that._tag === "AlreadyFlat",
  NeverFlat: (_: Flatten.AlreadyFlat<any>, that: unknown) => isFlatten(that) && that._tag === "NeverFlat"
}

const proto = {
  [FlattenTypeId]: { _A: (_: never) => _ },
  [Hash.symbol](this: Flatten.Flatten<any>): number {
    return Hash.cached(this, protoHash[this._tag](this as any))
  },
  [Equal.symbol](this: Flatten.Flatten<any>, that: unknown): boolean {
    return protoEqual[this._tag](this as any, that)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isFlatten = (u: unknown): u is Flatten.Flatten<unknown> =>
  typeof u === "object" && u != null && FlattenTypeId in u

/** @internal */
export const isFlattened = <A>(self: Flatten.Flatten<A>): self is Flatten.Flattened<A> => self._tag === "Flattened"

/** @internal */
export const isAlreadyFlat = <A>(self: Flatten.Flatten<A>): self is Flatten.AlreadyFlat<A> =>
  self._tag === "AlreadyFlat"

/** @internal */
export const isNeverFlat = <A>(self: Flatten.Flatten<A>): self is Flatten.NeverFlat<A> => self._tag === "NeverFlat"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const flattened = <A>(value: A): Flatten.Flatten<A> =>
  (() => {
    const op = Object.create(proto)
    op._tag = "Flattened"
    op.value = value
    return op
  })()

/** @internal */
export const alreadyFlat: Flatten.Flatten<never> = (() => {
  const op = Object.create(proto)
  op._tag = "AlreadyFlat"
  return op
})()

/** @internal */
export const neverFlat: Flatten.Flatten<never> = (() => {
  const op = Object.create(proto)
  op._tag = "NeverFlat"
  return op
})()

// -----------------------------------------------------------------------------
// Combinators
// -----------------------------------------------------------------------------

/** @internal */
export const map = dual<
  <A, B>(f: (a: A) => B) => (self: Flatten.Flatten<A>) => Flatten.Flatten<B>,
  <A, B>(self: Flatten.Flatten<A>, f: (a: A) => B) => Flatten.Flatten<B>
>(2, <A, B>(self: Flatten.Flatten<A>, f: (a: A) => B) => {
  switch (self._tag) {
    case "Flattened": {
      return flattened(f(self.value))
    }
    case "AlreadyFlat": {
      return alreadyFlat
    }
    case "NeverFlat": {
      return neverFlat
    }
  }
})
