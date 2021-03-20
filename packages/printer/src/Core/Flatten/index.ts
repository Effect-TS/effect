// tracing: off

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

export const flattened = <A>(value: A): Flattened<A> => ({
  _tag: "Flattened",
  value
})

export const alreadyFlat: Flatten<never> = {
  _tag: "AlreadyFlat"
}

export const neverFlat: Flatten<never> = {
  _tag: "NeverFlat"
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export const match = <A, R>(patterns: {
  readonly Flattened: (value: A) => R
  readonly AlreadyFlat: () => R
  readonly NeverFlat: () => R
}): ((flatten: Flatten<A>) => R) => {
  const f = (x: Flatten<A>): R => {
    switch (x._tag) {
      case "Flattened":
        return patterns.Flattened(x.value)
      case "AlreadyFlat":
        return patterns.AlreadyFlat()
      case "NeverFlat":
        return patterns.NeverFlat()
    }
  }
  return f
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export const isFlattened = <A>(a: Flatten<A>): a is Flattened<A> =>
  a._tag === "Flattened"

export const isAlreadyFlat = <A>(a: Flatten<A>): a is AlreadyFlat =>
  a._tag === "AlreadyFlat"

export const isNeverFlat = <A>(a: Flatten<A>): a is NeverFlat => a._tag === "NeverFlat"

export const map = <A, B>(f: (a: A) => B): ((fa: Flatten<A>) => Flatten<B>) =>
  match<A, Flatten<B>>({
    Flattened: (a) => flattened(f(a)),
    AlreadyFlat: () => alreadyFlat,
    NeverFlat: () => neverFlat
  })

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const FlattenURI = "@effect-ts/pretty/Flatten"

export type FlattenURI = typeof FlattenURI

declare module "@effect-ts/core/Prelude/HKT" {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [FlattenURI]: Flatten<A>
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

export const Covariant = P.instance<P.Covariant<[URI<FlattenURI>]>>({
  map
})
