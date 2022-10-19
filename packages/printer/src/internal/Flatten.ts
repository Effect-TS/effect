import type * as F from "@effect/printer/Flatten"
import type * as functor from "@fp-ts/core/Functor"
import * as Equal from "@fp-ts/data/Equal"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const FlattenSymbolKey = "@effect/printer/Flatten"
/** @internal */
export const FlattenTypeId: F.TypeId = Symbol.for(FlattenSymbolKey) as F.TypeId

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

class Flattened<A> implements F.Flattened<A>, Equal.Equal {
  readonly _tag = "Flattened"
  readonly _id: F.TypeId = FlattenTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly value: A) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.value))(Equal.hash(FlattenSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFlatten(that) &&
      that._tag === "Flattened" &&
      Equal.equals(this.value, that.value)
  }
}

class AlreadyFlat<A> implements F.AlreadyFlat<A>, Equal.Equal {
  readonly _tag = "AlreadyFlat"
  readonly _id: F.TypeId = FlattenTypeId
  readonly _A: (_: never) => A = variance;
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash("@effect/printer/Flattened/AlreadyFlat"))(Equal.hash(FlattenSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFlatten(that) && that._tag === "AlreadyFlat"
  }
}

class NeverFlat<A> implements F.NeverFlat<A>, Equal.Equal {
  readonly _tag = "NeverFlat"
  readonly _id: F.TypeId = FlattenTypeId
  readonly _A: (_: never) => A = variance;
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash("@effect/printer/Flattened/NeverFlat"))(Equal.hash(FlattenSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isFlatten(that) && that._tag === "NeverFlat"
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export function isFlatten(u: unknown): u is Flatten<unknown> {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === FlattenTypeId
}

/** @internal */
export function isFlattened<A>(a: Flatten<A>): a is Flattened<A> {
  return a._tag === "Flattened"
}

/** @internal */
export function isAlreadyFlat<A>(a: Flatten<A>): a is AlreadyFlat<A> {
  return a._tag === "AlreadyFlat"
}

/** @internal */
export function isNeverFlat<A>(a: Flatten<A>): a is NeverFlat<A> {
  return a._tag === "NeverFlat"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export function flattened<A>(value: A): Flatten<A> {
  return new Flattened(value)
}

/** @internal */
export const alreadyFlat: Flatten<never> = new AlreadyFlat()

/** @internal */
export const neverFlat: Flatten<never> = new NeverFlat()

// -----------------------------------------------------------------------------
// Combinators
// -----------------------------------------------------------------------------

/** @internal */
export function map<A, B>(f: (a: A) => B) {
  return (self: Flatten<A>): Flatten<B> => {
    return match<A, Flatten<B>>({
      Flattened: (a) => flattened(f(a)),
      AlreadyFlat: () => alreadyFlat,
      NeverFlat: () => neverFlat
    })(self)
  }
}

/** @internal */
export function match<A, R>(patterns: {
  readonly Flattened: (value: A) => R
  readonly AlreadyFlat: () => R
  readonly NeverFlat: () => R
}) {
  return (flatten: Flatten<A>): R => {
    switch (flatten._tag) {
      case "Flattened":
        return patterns.Flattened(flatten.value)
      case "AlreadyFlat":
        return patterns.AlreadyFlat()
      case "NeverFlat":
        return patterns.NeverFlat()
    }
  }
}

/** @internal */
export const Functor: functor.Functor<Flatten.TypeLambda> = {
  map
}
