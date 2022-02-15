// ets_tracing: off

import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"

// -------------------------------------------------------------------------------------
// definition
// -------------------------------------------------------------------------------------

/**
 * Because certain documents do not change after removal of newlines, etc,
 * there is no point in creating a `Union` of the flattened and unflattened
 * versions. All this leads to is the introduction of two possible branches
 * for a layout algorithm to take, resulting in potentially exponential
 * behavior on deeply nested examples.
 */
export type Flatten<A> = Flattened<A> | AlreadyFlat | NeverFlat

/**
 * Represents a `FlattenResult` where `A` is likely flatter than the input.
 */
export interface Flattened<A> {
  readonly _tag: "Flattened"
  readonly value: A
}

/**
 * Represents a `FlattenResult` where the input was already flat.
 */
export interface AlreadyFlat {
  readonly _tag: "AlreadyFlat"
}

/**
 * Represents a `FlattenResult` where the input cannot be flattened.
 */
export interface NeverFlat {
  readonly _tag: "NeverFlat"
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export function flattened<A>(value: A): Flattened<A> {
  return {
    _tag: "Flattened",
    value
  }
}

export const alreadyFlat: Flatten<never> = {
  _tag: "AlreadyFlat"
}

export const neverFlat: Flatten<never> = {
  _tag: "NeverFlat"
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export function match_<A, R>(
  flatten: Flatten<A>,
  patterns: {
    readonly Flattened: (value: A) => R
    readonly AlreadyFlat: () => R
    readonly NeverFlat: () => R
  }
): R {
  switch (flatten._tag) {
    case "Flattened":
      return patterns.Flattened(flatten.value)
    case "AlreadyFlat":
      return patterns.AlreadyFlat()
    case "NeverFlat":
      return patterns.NeverFlat()
  }
}

/**
 * @dataFirst match_
 */
export function match<A, R>(patterns: {
  readonly Flattened: (value: A) => R
  readonly AlreadyFlat: () => R
  readonly NeverFlat: () => R
}) {
  return (flatten: Flatten<A>): R => match_(flatten, patterns)
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function isFlattened<A>(a: Flatten<A>): a is Flattened<A> {
  return a._tag === "Flattened"
}

export function isAlreadyFlat<A>(a: Flatten<A>): a is AlreadyFlat {
  return a._tag === "AlreadyFlat"
}

export function isNeverFlat<A>(a: Flatten<A>): a is NeverFlat {
  return a._tag === "NeverFlat"
}

export function map_<A, B>(fa: Flatten<A>, f: (a: A) => B): Flatten<B> {
  return match_<A, Flatten<B>>(fa, {
    Flattened: (a) => flattened(f(a)),
    AlreadyFlat: () => alreadyFlat,
    NeverFlat: () => neverFlat
  })
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (fa: Flatten<A>): Flatten<B> => map_(fa, f)
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const FlattenURI = "@effect-ts/printer/Flatten"

export type FlattenURI = typeof FlattenURI

declare module "@effect-ts/core/Prelude/HKT" {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [FlattenURI]: Flatten<A>
  }
}

export const Covariant = P.instance<P.Covariant<[URI<FlattenURI>]>>({
  map
})
