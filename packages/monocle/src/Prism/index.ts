/**
 * A `Prism` is an optic used to select part of a sum type.
 *
 * Laws:
 *
 * 1. getOption(s).fold(s, reverseGet) = s
 * 2. getOption(reverseGet(a)) = Some(a)
 */
import type { Either } from "@effect-ts/core/Common/Either"
import * as O from "@effect-ts/core/Common/Option"
import type { Predicate, Refinement } from "@effect-ts/core/Function"
import { flow, identity, pipe } from "@effect-ts/core/Function"
import type { Newtype } from "@effect-ts/core/Newtype"
import * as P from "@effect-ts/core/Prelude"

import * as _ from "../Internal"
import type { Lens } from "../Lens"
import type { Optional } from "../Optional"
import type { Traversal } from "../Traversal"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Option = O.Option

export interface Prism<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly reverseGet: (a: A) => S
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const id = <S>(): Prism<S, S> => ({
  getOption: O.some,
  reverseGet: identity
})

export const fromPredicate: {
  <S, A extends S>(refinement: Refinement<S, A>): Prism<S, A>
  <A>(predicate: Predicate<A>): Prism<A, A>
} = _.prismFromPredicate

// -------------------------------------------------------------------------------------
// converters
// -------------------------------------------------------------------------------------

/**
 * View a `Prism` as a `Optional`
 */
export const asOptional: <S, A>(sa: Prism<S, A>) => Optional<S, A> = _.prismAsOptional

/**
 * View a `Prism` as a `Traversal`
 */
export const asTraversal: <S, A>(sa: Prism<S, A>) => Traversal<S, A> =
  _.prismAsTraversal

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose a `Prism` with a `Prism`
 */
export const compose = <A, B>(ab: Prism<A, B>) => <S>(
  sa: Prism<S, A>
): Prism<S, B> => ({
  getOption: flow(sa.getOption, O.chain(ab.getOption)),
  reverseGet: flow(ab.reverseGet, sa.reverseGet)
})

/**
 * Compose a `Prism` with a `Lens`
 */
export const composeLens: <A, B>(
  ab: Lens<A, B>
) => <S>(sa: Prism<S, A>) => Optional<S, B> = _.prismComposeLens

/**
 * Compose a `Prism` with an `Optional`
 */
export const composeOptional = <A, B>(ab: Optional<A, B>) => <S>(
  sa: Prism<S, A>
): Optional<S, B> => _.optionalComposeOptional(ab)(asOptional(sa))

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const set: <A>(a: A) => <S>(sa: Prism<S, A>) => (s: S) => S = _.prismSet

export const modifyOption: <A>(
  f: (a: A) => A
) => <S>(sa: Prism<S, A>) => (s: S) => Option<S> = _.prismModifyOption

export const modify: <A>(f: (a: A) => A) => <S>(sa: Prism<S, A>) => (s: S) => S =
  _.prismModify

/**
 * Return a `Prism` from a `Prism` focused on a nullable value
 */
export const fromNullable: <S, A>(
  sa: Prism<S, A>
) => Prism<S, NonNullable<A>> = compose(_.prismFromNullable())

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): <S>(sa: Prism<S, A>) => Prism<S, B>
export function filter<A>(predicate: Predicate<A>): <S>(sa: Prism<S, A>) => Prism<S, A>
export function filter<A>(
  predicate: Predicate<A>
): <S>(sa: Prism<S, A>) => Prism<S, A> {
  return compose(_.prismFromPredicate(predicate))
}

/**
 * Return a `Optional` from a `Prism` and a prop
 */
export const prop = <A, P extends keyof A>(
  prop: P
): (<S>(sa: Prism<S, A>) => Optional<S, A[P]>) =>
  composeLens(pipe(_.lensId<A>(), _.lensProp(prop)))

/**
 * Return a `Optional` from a `Prism` and a list of props
 */
export const props = <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): (<S>(sa: Prism<S, A>) => Optional<S, { [K in P]: A[K] }>) =>
  composeLens(pipe(_.lensId<A>(), _.lensProps(...props)))

/**
 * Return a `Optional` from a `Prism` and a component
 */
export const component = <A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): (<S>(sa: Prism<S, A>) => Optional<S, A[P]>) =>
  composeLens(pipe(_.lensId<A>(), _.lensComponent(prop)))

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyArray`
 */
export const index = (i: number) => <S, A>(
  sa: Prism<S, ReadonlyArray<A>>
): Optional<S, A> =>
  pipe(sa, asOptional, _.optionalComposeOptional(_.indexArray<A>().index(i)))

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a key
 */
export const key = (key: string) => <S, A>(
  sa: Prism<S, Readonly<Record<string, A>>>
): Optional<S, A> =>
  pipe(sa, asOptional, _.optionalComposeOptional(_.indexRecord<A>().index(key)))

/**
 * Return a `Optional` from a `Prism` focused on a `ReadonlyRecord` and a required key
 */
export const atKey = (key: string) => <S, A>(
  sa: Prism<S, Readonly<Record<string, A>>>
): Optional<S, Option<A>> => _.prismComposeLens(_.atRecord<A>().at(key))(sa)

/**
 * Return a `Prism` from a `Prism` focused on the `Some` of a `Option` type
 */
export const some: <S, A>(soa: Prism<S, Option<A>>) => Prism<S, A> = compose(
  _.prismSome()
)

/**
 * Return a `Prism` from a `Prism` focused on the `Right` of a `Either` type
 */
export const right: <S, E, A>(sea: Prism<S, Either<E, A>>) => Prism<S, A> = compose(
  _.prismRight()
)

/**
 * Return a `Prism` from a `Prism` focused on the `Left` of a `Either` type
 */
export const left: <S, E, A>(sea: Prism<S, Either<E, A>>) => Prism<S, E> = compose(
  _.prismLeft()
)

/**
 * Return a `Traversal` from a `Prism` focused on a `Traversable`
 */
export function traverse<T extends P.URIS, C = P.Auto>(
  T: P.Traversable<T, C>
): <TN extends string, TK, TQ, TW, TX, TI, TS, TR, TE, S, A>(
  sta: Prism<S, P.Kind<T, C, TN, TK, TQ, TW, TX, TI, TS, TR, TE, A>>
) => Traversal<S, A> {
  return flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()))
}

export const findFirst: <A>(
  predicate: Predicate<A>
) => <S>(sa: Prism<S, ReadonlyArray<A>>) => Optional<S, A> = flow(
  _.findFirst,
  composeOptional
)

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

export const imap: <A, B>(
  f: (a: A) => B,
  g: (b: B) => A
) => <E>(sa: Prism<E, A>) => Prism<E, B> = (f, g) => (ea) => ({
  getOption: flow(ea.getOption, O.map(f)),
  reverseGet: flow(g, ea.reverseGet)
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "monocle/Prism"
export type URI = typeof URI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [URI]: Prism<I, A>
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

export function newtype<T extends Newtype<any, any>>(
  getOption: (_: T["_A"]) => boolean
): Prism<T["_A"], T> {
  return {
    getOption: (_) => (getOption(_) ? O.some(_) : O.none),
    reverseGet: (_) => _ as any
  }
}
