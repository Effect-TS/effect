/**
 * A `Traversal` is the generalisation of an `Optional` to several targets. In other word, a `Traversal` allows to focus
 * from a type `S` into `0` to `n` values of type `A`.
 *
 * The most common example of a `Traversal` would be to focus into all elements inside of a container (e.g.
 * `Array`, `Option`). To do this we will use the relation between the typeclass `Traversable` and `Traversal`.
 */
import * as A from "@effect-ts/core/Classic/Array"
import * as C from "@effect-ts/core/Classic/Const"
import type { Either } from "@effect-ts/core/Classic/Either"
import * as I from "@effect-ts/core/Classic/Id"
import type { Identity } from "@effect-ts/core/Classic/Identity"
import type { Option } from "@effect-ts/core/Classic/Option"
import type { Predicate, Refinement } from "@effect-ts/core/Function"
import { identity, pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/core/Persistent/List"
import * as P from "@effect-ts/core/Prelude"

import * as _ from "../Internal"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

export interface ModifyF<S, A> {
  <F extends P.URIS, C = P.Auto>(F: P.Applicative<F, C>): <
    FN extends string,
    FK,
    FQ,
    FW,
    FX,
    FI,
    FS,
    FR,
    FE
  >(
    f: (a: A) => P.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, A>
  ) => (s: S) => P.Kind<F, C, FN, FK, FQ, FW, FX, FI, FS, FR, FE, S>
}

export interface Traversal<S, A> {
  readonly modifyF: ModifyF<S, A>
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const id = <S>(): Traversal<S, S> => ({
  modifyF: (_) => (f) => f
})

/**
 * Create a `Traversal` from a `Traversable`
 */
export const fromTraversable = _.fromTraversable

// -------------------------------------------------------------------------------------
// compositions
// -------------------------------------------------------------------------------------

/**
 * Compose a `Traversal` with a `Traversal`
 */
export const compose: <A, B>(
  ab: Traversal<A, B>
) => <S>(sa: Traversal<S, A>) => Traversal<S, B> = _.traversalComposeTraversal

// -------------------------------------------------------------------------------------
// combinators
// -------------------------------------------------------------------------------------

export const modify = <A>(f: (a: A) => A) => <S>(
  sa: Traversal<S, A>
): ((s: S) => S) => {
  return sa.modifyF(I.Applicative)(f)
}

export const set = <A>(a: A): (<S>(sa: Traversal<S, A>) => (s: S) => S) => {
  return modify(() => a)
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): <S>(sa: Traversal<S, A>) => Traversal<S, B>
export function filter<A>(
  predicate: Predicate<A>
): <S>(sa: Traversal<S, A>) => Traversal<S, A>
export function filter<A>(
  predicate: Predicate<A>
): <S>(sa: Traversal<S, A>) => Traversal<S, A> {
  return compose(_.prismAsTraversal(_.prismFromPredicate(predicate)))
}

/**
 * Return a `Traversal` from a `Traversal` and a prop
 */
export const prop = <A, P extends keyof A>(
  prop: P
): (<S>(sa: Traversal<S, A>) => Traversal<S, A[P]>) =>
  compose(pipe(_.lensId<A>(), _.lensProp(prop), _.lensAsTraversal))

/**
 * Return a `Traversal` from a `Traversal` and a list of props
 */
export const props = <A, P extends keyof A>(
  ...props: [P, P, ...Array<P>]
): (<S>(sa: Traversal<S, A>) => Traversal<S, { [K in P]: A[K] }>) =>
  compose(pipe(_.lensId<A>(), _.lensProps(...props), _.lensAsTraversal))

/**
 * Return a `Traversal` from a `Traversal` and a component
 */
export const component = <A extends ReadonlyArray<unknown>, P extends keyof A>(
  prop: P
): (<S>(sa: Traversal<S, A>) => Traversal<S, A[P]>) =>
  compose(pipe(_.lensId<A>(), _.lensComponent(prop), _.lensAsTraversal))

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyArray`
 */
export const index = (i: number) => <S, A>(
  sa: Traversal<S, ReadonlyArray<A>>
): Traversal<S, A> =>
  pipe(sa, compose(_.optionalAsTraversal(_.indexArray<A>().index(i))))

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a key
 */
export const key = (key: string) => <S, A>(
  sa: Traversal<S, Readonly<Record<string, A>>>
): Traversal<S, A> =>
  pipe(sa, compose(_.optionalAsTraversal(_.indexRecord<A>().index(key))))

/**
 * Return a `Traversal` from a `Traversal` focused on a `ReadonlyRecord` and a required key
 */
export const atKey = (key: string) => <S, A>(
  sa: Traversal<S, Readonly<Record<string, A>>>
): Traversal<S, Option<A>> =>
  pipe(sa, compose(_.lensAsTraversal(_.atRecord<A>().at(key))))

/**
 * Return a `Traversal` from a `Traversal` focused on the `Some` of a `Option` type
 */
export const some: <S, A>(soa: Traversal<S, Option<A>>) => Traversal<S, A> =
  /*#__PURE__*/
  compose(_.prismAsTraversal(_.prismSome()))

/**
 * Return a `Traversal` from a `Traversal` focused on the `Right` of a `Either` type
 */
export const right: <S, E, A>(sea: Traversal<S, Either<E, A>>) => Traversal<S, A> =
  /*#__PURE__*/
  compose(_.prismAsTraversal(_.prismRight()))

/**
 * Return a `Traversal` from a `Traversal` focused on the `Left` of a `Either` type
 */
export const left: <S, E, A>(
  sea: Traversal<S, Either<E, A>>
) => Traversal<S, E> = compose(_.prismAsTraversal(_.prismLeft()))

/**
 * Return a `Traversal` from a `Traversal` focused on a `Traversable`
 */
export function traverse<T extends P.URIS, C = P.Auto>(
  T: P.Traversable<T, C>
): <TN extends string, TK, TQ, TW, TX, TI, TS, TR, TE, S, A>(
  sta: Traversal<S, P.Kind<T, C, TN, TK, TQ, TW, TX, TI, TS, TR, TE, A>>
) => Traversal<S, A> {
  return compose(fromTraversable(T)())
}

/**
 * Map each target to a `Monoid` and combine the results.
 */
export const foldMap = <M>(M: Identity<M>) => {
  const _ = C.getApplicative(M)
  return <A>(f: (a: A) => M) => <S>(sa: Traversal<S, A>): ((s: S) => M) =>
    sa.modifyF(_)(f as any)
}

/**
 * Map each target to a `Monoid` and combine the results.
 */
export const fold = <A>(M: Identity<A>): (<S>(sa: Traversal<S, A>) => (s: S) => A) =>
  foldMap(M)(identity)

const unknownId = A.getIdentity<any>()

/**
 * Get all the targets of a `Traversal`.
 */
export const getAll = <S>(s: S) => <A>(sa: Traversal<S, A>): ReadonlyArray<A> =>
  foldMap(unknownId)((a: A) => [a])(sa)(s)

const unknownIdList = L.getIdentity<any>()

/**
 * Get all the targets of a `Traversal`.
 */
export const getAllList = <S>(s: S) => <A>(sa: Traversal<S, A>): L.List<A> =>
  foldMap(unknownIdList as Identity<L.List<A>>)(L.of as (a: A) => L.List<A>)(sa)(s)

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const URI = "monocle/Traversal"
export type URI = typeof URI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    [URI]: Traversal<I, A>
  }
}

export const Category = P.instance<P.Category<[URI]>>({
  compose,
  id
})
