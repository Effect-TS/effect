/**
 * An `Iso` is an optic which converts elements of type `S` into elements of type `A` without loss.
 *
 * Laws:
 *
 * 1. reverseGet(get(s)) = s
 * 2. get(reversetGet(a)) = a
 */
import { flow, identity, pipe } from "@effect-ts/core/Function"
import type { Newtype } from "@effect-ts/core/Newtype"
import * as O from "@effect-ts/core/Option"
import * as P from "@effect-ts/core/Prelude"

import * as _ from "../Internal"
import type { Lens } from "../Lens"
import type { Optional } from "../Optional"
import type { Prism } from "../Prism"
import type { Traversal } from "../Traversal"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface Iso<S, A> {
  readonly get: (s: S) => A
  readonly reverseGet: (a: A) => S
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const id = <S>(): Iso<S, S> => ({
  get: identity,
  reverseGet: identity
})

// -------------------------------------------------------------------------------------
// converters
// -------------------------------------------------------------------------------------

/**
 * View an `Iso` as a `Lens`
 */
export const asLens: <S, A>(sa: Iso<S, A>) => Lens<S, A> = _.isoAsLens

/**
 * View an `Iso` as a `Prism`
 */
export const asPrism = <S, A>(sa: Iso<S, A>): Prism<S, A> => ({
  getOption: flow(sa.get, O.some),
  reverseGet: sa.reverseGet
})

/**
 * View an `Iso` as a `Optional`
 */
export const asOptional: <S, A>(sa: Iso<S, A>) => Optional<S, A> = _.isoAsOptional

/**
 * View an `Iso` as a `Traversal`
 */
export const asTraversal = <S, A>(sa: Iso<S, A>): Traversal<S, A> => ({
  modifyF: (F) => (f) => (s) =>
    pipe(
      f(sa.get(s)),
      F.map((a) => sa.reverseGet(a))
    )
})

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose an `Iso` with an `Iso`
 */
export const compose = <A, B>(ab: Iso<A, B>) => <S>(sa: Iso<S, A>): Iso<S, B> => ({
  get: flow(sa.get, ab.get),
  reverseGet: flow(ab.reverseGet, sa.reverseGet)
})

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const reverse = <S, A>(sa: Iso<S, A>): Iso<A, S> => ({
  get: sa.reverseGet,
  reverseGet: sa.get
})

export const modify = <A>(f: (a: A) => A) => <S>(sa: Iso<S, A>) => (s: S): S =>
  sa.reverseGet(f(sa.get(s)))

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

export const imap: <A, B>(
  f: (a: A) => B,
  g: (b: B) => A
) => <S>(sa: Iso<S, A>) => Iso<S, B> = (f, g) => (ea) => ({
  get: flow(ea.get, f),
  reverseGet: flow(g, ea.reverseGet)
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "monocle/Iso"
export type URI = typeof URI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [URI]: Iso<I, A>
  }
}

export const Category = P.instance<P.Category<[URI]>>({
  compose,
  id
})

export const Invariant = P.instance<P.Invariant<[URI]>>({
  invmap: ({ f, g }) => ({
    f: imap(f, g),
    g: imap(g, f)
  })
})

export function newtype<T extends Newtype<any, any>>(): Iso<T["_A"], T> {
  return {
    get: (_) => _ as any,
    reverseGet: (_) => _ as any
  }
}
