/**
 * @since 2.0.0
 */
import type { NonEmptyReadonlyArray } from "../ReadonlyArray"

// -------------------------------------------------------------------------------------
// ReadonlyArray
// -------------------------------------------------------------------------------------

/** @internal */
export const empty: readonly [] = []

/** @internal */
export const fromIterable = <A>(collection: Iterable<A>): ReadonlyArray<A> =>
  Array.isArray(collection) ? collection : Array.from(collection)

// -------------------------------------------------------------------------------------
// NonEmptyReadonlyArray
// -------------------------------------------------------------------------------------

/** @internal */
export const isNonEmpty = <A>(as: ReadonlyArray<A>): as is NonEmptyReadonlyArray<A> => as.length > 0

/** @internal */
export const head = <A>(as: NonEmptyReadonlyArray<A>): A => as[0]

/** @internal */
export const tail = <A>(as: NonEmptyReadonlyArray<A>): ReadonlyArray<A> => as.slice(1)

// -------------------------------------------------------------------------------------
// Record
// -------------------------------------------------------------------------------------

/** @internal */
export const Do: Readonly<{}> = {}

/** @internal */
export const has = Object.prototype.hasOwnProperty

// -------------------------------------------------------------------------------------
// NonEmptyArray
// -------------------------------------------------------------------------------------

/**
 * @internal
 * @since 2.0.0
 */
export type NonEmptyArray<A> = [A, ...Array<A>]

/** @internal */
export const toNonEmptyArray = <A>(a: A): NonEmptyArray<A> => [a]

/** @internal */
export const fromNonEmptyReadonlyArray = <A>(
  as: NonEmptyReadonlyArray<A>
): NonEmptyArray<A> => [head(as), ...tail(as)]
