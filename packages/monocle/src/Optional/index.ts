/**
 * An `Optional` is an optic used to zoom inside a product. Unlike the `Lens`, the element that the `Optional` focuses
 * on may not exist.
 *
 * `Optional`s have two type parameters generally called `S` and `A`: `Optional<S, A>` where `S` represents the product
 * and `A` an optional element inside of `S`.
 *
 * Laws:
 *
 * 1. getOption(s).fold(() => s, a => set(a)(s)) = s
 * 2. getOption(set(a)(s)) = getOption(s).map(_ => a)
 * 3. set(a)(set(a)(s)) = set(a)(s)
 */
import type { Either } from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import type { Predicate, Refinement } from "@effect-ts/core/Function"
import { constant, flow, pipe } from "@effect-ts/core/Function"
import * as P from "@effect-ts/core/Prelude"

import * as _ from "../Internal"
import type { Traversal } from "../Traversal"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

import Option = O.Option

export interface Optional<S, A> {
  readonly getOption: (s: S) => Option<A>
  readonly set: (a: A) => (s: S) => S
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const id = <S>(): Optional<S, S> => ({
  getOption: O.some,
  set: constant
})

// -------------------------------------------------------------------------------------
// converters
// -------------------------------------------------------------------------------------

/**
 * View a `Optional` as a `Traversal`
 */
export const asTraversal: <S, A>(sa: Optional<S, A>) => Traversal<S, A> =
  _.optionalAsTraversal

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose a `Optional` with a `Optional`
 */
export const compose: <A, B>(
  ab: Optional<A, B>
) => <S>(sa: Optional<S, A>) => Optional<S, B> = _.optionalComposeOptional

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const modifyOption: <A>(
  f: (a: A) => A
) => <S>(optional: Optional<S, A>) => (s: S) => Option<S> = _.optionalModifyOption

export const modify: <A>(
  f: (a: A) => A
) => <S>(optional: Optional<S, A>) => (s: S) => S = _.optionalModify

/**
 * Return an `Optional` from a `Optional` focused on a nullable value
 */
export const fromNullable: <S, A>(
  sa: Optional<S, A>
) => Optional<S, NonNullable<A>> = compose(_.prismAsOptional(_.prismFromNullable()))

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): <S>(sa: Optional<S, A>) => Optional<S, B>
export function filter<A>(
  predicate: Predicate<A>
): <S>(sa: Optional<S, A>) => Optional<S, A>
export function filter<A>(
  predicate: Predicate<A>
): <S>(sa: Optional<S, A>) => Optional<S, A> {
  return compose(_.prismAsOptional(_.prismFromPredicate(predicate)))
}

/**
 * Return a `Optional` from a `Optional` and a prop
 */
export const prop = <A, P extends keyof A>(
  prop: P
): (<S>(sa: Optional<S, A>) => Optional<S, A[P]>) =>
  compose(pipe(_.lensId<A>(), _.lensProp(prop), _.lensAsOptional))

/**
 * Return a `Optional` from a `Optional` and a list of props
 */
export const props = <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): (<S>(sa: Optional<S, A>) => Optional<S, { [K in P]: A[K] }>) =>
  compose(pipe(_.lensId<A>(), _.lensProps(...props), _.lensAsOptional))

/**
 * Return a `Optional` from a `Optional` and a component
 */
export const component = <A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): (<S>(sa: Optional<S, A>) => Optional<S, A[P]>) =>
  compose(pipe(_.lensId<A>(), _.lensComponent(prop), _.lensAsOptional))

/**
 * Return a `Optional` from a `Optional` focused on a `ReadonlyArray`
 */
export const index = (i: number) => <S, A>(
  sa: Optional<S, ReadonlyArray<A>>
): Optional<S, A> => pipe(sa, _.optionalComposeOptional(_.indexArray<A>().index(i)))

/**
 * Return a `Optional` from a `Optional` focused on a `ReadonlyRecord` and a key
 */
export const key = (key: string) => <S, A>(
  sa: Optional<S, Readonly<Record<string, A>>>
): Optional<S, A> => pipe(sa, _.optionalComposeOptional(_.indexRecord<A>().index(key)))

/**
 * Return a `Optional` from a `Optional` focused on a `ReadonlyRecord` and a required key
 */
export const atKey = (key: string) => <S, A>(
  sa: Optional<S, Readonly<Record<string, A>>>
): Optional<S, Option<A>> =>
  pipe(sa, compose(_.lensAsOptional(_.atRecord<A>().at(key))))

/**
 * Return a `Optional` from a `Optional` focused on the `Some` of a `Option` type
 */
export const some: <S, A>(soa: Optional<S, Option<A>>) => Optional<S, A> = compose(
  _.prismAsOptional(_.prismSome())
)

/**
 * Return a `Optional` from a `Optional` focused on the `Right` of a `Either` type
 */
export const right: <S, E, A>(
  sea: Optional<S, Either<E, A>>
) => Optional<S, A> = compose(_.prismAsOptional(_.prismRight()))

/**
 * Return a `Optional` from a `Optional` focused on the `Left` of a `Either` type
 */
export const left: <S, E, A>(
  sea: Optional<S, Either<E, A>>
) => Optional<S, E> = compose(_.prismAsOptional(_.prismLeft()))

/**
 * Return a `Traversal` from a `Optional` focused on a `Traversable`
 */
export function traverse<T extends P.URIS, C = P.Auto>(
  T: P.Traversable<T, C>
): <TN extends string, TK, TQ, TW, TX, TI, TS, TR, TE, S, A>(
  sta: Optional<S, P.Kind<T, C, TN, TK, TQ, TW, TX, TI, TS, TR, TE, A>>
) => Traversal<S, A> {
  return flow(asTraversal, _.traversalComposeTraversal(_.fromTraversable(T)()))
}

export const findFirst: <A>(
  predicate: Predicate<A>
) => <S>(sa: Optional<S, ReadonlyArray<A>>) => Optional<S, A> =
  /*#__PURE__*/
  flow(_.findFirst, compose)

// -------------------------------------------------------------------------------------
// pipeables
// -------------------------------------------------------------------------------------

export const imap: <A, B>(
  f: (a: A) => B,
  g: (b: B) => A
) => <E>(fa: Optional<E, A>) => Optional<E, B> = (f, g) => (ea) => ({
  getOption: flow(ea.getOption, O.map(f)),
  set: flow(g, ea.set)
})

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "monocle/Optional"
export type URI = typeof URI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [URI]: Optional<E, A>
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
