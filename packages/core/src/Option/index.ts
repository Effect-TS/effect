/* adapted from https://github.com/gcanti/fp-ts */

import { Alternative1 } from "fp-ts/lib/Alternative"

import * as AP from "../Apply"
import type {
  CAlternative1,
  CApplicative,
  CCompactable1,
  CExtend1,
  CFilterable1,
  CFoldable1,
  CMonad1,
  CSequence1,
  CTraversable1,
  CTraverse1,
  CWilt1,
  CWither1,
  CWitherable1,
  HKT,
  Separated,
  CFilter1,
  CPartition1,
  CApplicative1,
  Traverse1,
  Wither1,
  Wilt1,
  Monad1,
  Foldable1,
  Traversable1,
  Extend1,
  Compactable1,
  Filterable1,
  Witherable1,
  Applicative1,
  Filter1,
  Partition1,
  Applicative
} from "../Base"
import { Do as DoG } from "../Do"
import { Either } from "../Either"
import type { Eq } from "../Eq"
import type { Lazy, Predicate, Refinement } from "../Function"
import { fold as foldMonoid, Monoid } from "../Monoid"
import type { Ord } from "../Ord"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"
import type { Effect, Managed, Stream, StreamEither } from "../Support/Common"

export interface None {
  readonly _tag: "None"
}

export interface Some<A> {
  readonly _tag: "Some"
  readonly value: A
}

export declare type Option<A> = None | Some<A>

export const alt_: <A>(fx: Option<A>, fy: () => Option<A>) => Option<A> = (ma, f) =>
  isNone(ma) ? f() : ma

export const alt: <A>(that: () => Option<A>) => (fa: Option<A>) => Option<A> = (
  that
) => (fa) => (isNone(fa) ? that() : fa)

export type AOfOptions<Ts extends Option<any>[]> = {
  [k in keyof Ts]: Ts[k] extends Option<infer A> ? A : never
}[number]

export const none: Option<never> = { _tag: "None" }

export const ap_: <A, B>(fab: Option<(a: A) => B>, fa: Option<A>) => Option<B> = (
  mab,
  ma
) => (isNone(mab) ? none : isNone(ma) ? none : some(mab.value(ma.value)))

export const ap: <A>(fa: Option<A>) => <B>(fab: Option<(a: A) => B>) => Option<B> = (
  fa
) => (fab) => ap_(fab, fa)

export const apFirst: <B>(fb: Option<B>) => <A>(fa: Option<A>) => Option<A> = (fb) => (
  fa
) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const chain_: <A, B>(fa: Option<A>, f: (a: A) => Option<B>) => Option<B> = (
  ma,
  f
) => (isNone(ma) ? none : f(ma.value))

export const chain: <A, B>(f: (a: A) => Option<B>) => (ma: Option<A>) => Option<B> = (
  f
) => (ma) => chain_(ma, f)

export const chainTap = <A, B>(f: (a: A) => Option<B>) => (ma: Option<A>): Option<A> =>
  chain_(ma, (a) => map_(f(a), () => a))

export const chainTap_ = <A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<A> =>
  chain_(ma, (a) => map_(f(a), () => a))

export const URI = "@matechs/core/Option"
export type URI = typeof URI

const identity = <A>(a: A): A => a

declare module "../Base/HKT" {
  interface URItoKind<A> {
    readonly [URI]: Option<A>
  }
}

export const compact = <A>(fa: Option<Option<A>>): Option<A> => chain_(fa, identity)

export const duplicate: <A>(ma: Option<A>) => Option<Option<A>> = (ma) =>
  isNone(ma) ? none : some(ma)

/**
 * Returns `true` if `ma` contains `a`
 *
 * @example
 * import { some, none, elem } from '@matechs/core/Option'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * assert.strictEqual(elem(eqNumber)(1, some(1)), true)
 * assert.strictEqual(elem(eqNumber)(2, some(1)), false)
 * assert.strictEqual(elem(eqNumber)(1, none), false)
 */
export function elem<A>(E: Eq<A>): (a: A, ma: Option<A>) => boolean {
  return (a, ma) => (isNone(ma) ? false : E.equals(a, ma.value))
}

/**
 * Returns `true` if the predicate is satisfied by the wrapped value
 *
 * @example
 * import { some, none, exists } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     exists(n => n > 0)
 *   ),
 *   true
 * )
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     exists(n => n > 1)
 *   ),
 *   false
 * )
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     exists(n => n > 0)
 *   ),
 *   false
 * )
 */
export function exists<A>(predicate: Predicate<A>): (ma: Option<A>) => boolean {
  return (ma) => (isNone(ma) ? false : predicate(ma.value))
}

export const extend = <A, B>(f: (fa: Option<A>) => B) => (wa: Option<A>): Option<B> =>
  isNone(wa) ? none : some(f(wa))

export const extend_ = <A, B>(wa: Option<A>, f: (fa: Option<A>) => B): Option<B> =>
  isNone(wa) ? none : some(f(wa))

export const filter: CFilter1<URI> = <A>(predicate: Predicate<A>) => (
  fa: Option<A>
): Option<A> => (isNone(fa) ? none : predicate(fa.value) ? fa : none)

export const filter_: Filter1<URI> = <A>(
  fa: Option<A>,
  predicate: Predicate<A>
): Option<A> => (isNone(fa) ? none : predicate(fa.value) ? fa : none)

export const filterMap: <A, B>(
  f: (a: A) => Option<B>
) => (fa: Option<A>) => Option<B> = (f) => (ma) => (isNone(ma) ? none : f(ma.value))

export const filterMap_: <A, B>(fa: Option<A>, f: (a: A) => Option<B>) => Option<B> = (
  ma,
  f
) => (isNone(ma) ? none : f(ma.value))

export const flatten = <A>(fa: Option<Option<A>>): Option<A> => chain_(fa, identity)

/**
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `None` the default value is
 * returned, otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @example
 * import { some, none, fold } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     fold(() => 'a none', a => `a some containing ${a}`)
 *   ),
 *   'a some containing 1'
 * )
 *
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     fold(() => 'a none', a => `a some containing ${a}`)
 *   ),
 *   'a none'
 * )
 */
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Effect<S1, R1, E1, B>,
  onSome: (a: A) => Effect<S2, R2, E2, C>
): (ma: Option<A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Stream<S1, R1, E1, B>,
  onSome: (a: A) => Stream<S2, R2, E2, C>
): (ma: Option<A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Option<A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, A, B, C, R1, E1, R2, E2>(
  onNone: () => Managed<S1, R1, E1, B>,
  onSome: (a: A) => Managed<S2, R2, E2, C>
): (ma: Option<A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<A, B, C>(
  onNone: () => B,
  onSome: (a: A) => C
): (ma: Option<A>) => B | C
export function fold<A, B>(onNone: () => B, onSome: (a: A) => B): (ma: Option<A>) => B {
  return (ma) => (isNone(ma) ? onNone() : onSome(ma.value))
}

export function fold_<S1, S2, A, B, C, R1, E1, R2, E2>(
  ma: Option<A>,
  onNone: () => Effect<S1, R1, E1, B>,
  onSome: (a: A) => Effect<S2, R2, E2, C>
): Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, A, B, C, R1, E1, R2, E2>(
  ma: Option<A>,
  onNone: () => Stream<S1, R1, E1, B>,
  onSome: (a: A) => Stream<S2, R2, E2, C>
): Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, A, B, C, R1, E1, R2, E2>(
  ma: Option<A>,
  onNone: () => StreamEither<S1, R1, E1, B>,
  onSome: (a: A) => StreamEither<S2, R2, E2, C>
): StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, A, B, C, R1, E1, R2, E2>(
  ma: Option<A>,
  onNone: () => Managed<S1, R1, E1, B>,
  onSome: (a: A) => Managed<S2, R2, E2, C>
): Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<A, B, C>(
  ma: Option<A>,
  onNone: () => B,
  onSome: (a: A) => C
): B | C
export function fold_<A, B>(ma: Option<A>, onNone: () => B, onSome: (a: A) => B): B {
  return isNone(ma) ? onNone() : onSome(ma.value)
}

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => (fa: Option<A>) => M = (M) => (f) => (fa) =>
  isNone(fa) ? M.empty : f(fa.value)

export const foldMap_: <M>(M: Monoid<M>) => <A>(fa: Option<A>, f: (a: A) => M) => M = (
  M
) => (fa, f) => (isNone(fa) ? M.empty : f(fa.value))

export const fromEither: <E, A>(ma: Either<E, A>) => Option<A> = (ma) =>
  ma._tag === "Left" ? none : some(ma.right)

/**
 * Constructs a new `Option` from a nullable type. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`
 *
 * @example
 * import { none, some, fromNullable } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(fromNullable(undefined), none)
 * assert.deepStrictEqual(fromNullable(null), none)
 * assert.deepStrictEqual(fromNullable(1), some(1))
 */
export function fromNullable<A>(a: A): Option<NonNullable<A>> {
  return a == null ? none : some(a as NonNullable<A>)
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @example
 * import { none, some, fromPredicate } from '@matechs/core/Option'
 *
 * const getOption = fromPredicate((n: number) => n >= 0)
 *
 * assert.deepStrictEqual(getOption(-1), none)
 * assert.deepStrictEqual(getOption(1), some(1))
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>
): (a: A) => Option<B>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
  return (a) => (predicate(a) ? some(a) : none)
}

export function getApplyMonoid<A>(M: Monoid<A>): Monoid<Option<A>> {
  return {
    ...getApplySemigroup(M),
    empty: some(M.empty)
  }
}

/**
 * `Apply` semigroup
 *
 * | x       | y       | concat(x, y)       |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | none               |
 * | none    | some(a) | none               |
 * | some(a) | some(b) | some(concat(a, b)) |
 *
 * @example
 * import { getApplySemigroup, some, none } from '@matechs/core/Option'
 * import { semigroupSum } from '@matechs/core/Semigroup'
 *
 * const S = getApplySemigroup(semigroupSum)
 * assert.deepStrictEqual(S.concat(none, none), none)
 * assert.deepStrictEqual(S.concat(some(1), none), none)
 * assert.deepStrictEqual(S.concat(none, some(1)), none)
 * assert.deepStrictEqual(S.concat(some(1), some(2)), some(3))
 */
export function getApplySemigroup<A>(S: Semigroup<A>): Semigroup<Option<A>> {
  return {
    concat: (x, y) => (isSome(x) && isSome(y) ? some(S.concat(x.value, y.value)) : none)
  }
}

/**
 * @example
 * import { none, some, getEq } from '@matechs/core/Option'
 * import { eqNumber } from '@matechs/core/Eq'
 *
 * const E = getEq(eqNumber)
 * assert.strictEqual(E.equals(none, none), true)
 * assert.strictEqual(E.equals(none, some(1)), false)
 * assert.strictEqual(E.equals(some(1), none), false)
 * assert.strictEqual(E.equals(some(1), some(2)), false)
 * assert.strictEqual(E.equals(some(1), some(1)), true)
 */
export function getEq<A>(E: Eq<A>): Eq<Option<A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (isNone(x) ? isNone(y) : isNone(y) ? false : E.equals(x.value, y.value))
  }
}

export const getFirst = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getFirstMonoid<AOfOptions<Ts>>())(items)

/**
 * Monoid returning the left-most non-`None` value
 *
 * | x       | y       | concat(x, y) |
 * | ------- | ------- | ------------ |
 * | none    | none    | none         |
 * | some(a) | none    | some(a)      |
 * | none    | some(a) | some(a)      |
 * | some(a) | some(b) | some(a)      |
 *
 * @example
 * import { getFirstMonoid, some, none } from '@matechs/core/Option'
 *
 * const M = getFirstMonoid<number>()
 * assert.deepStrictEqual(M.concat(none, none), none)
 * assert.deepStrictEqual(M.concat(some(1), none), some(1))
 * assert.deepStrictEqual(M.concat(none, some(1)), some(1))
 * assert.deepStrictEqual(M.concat(some(1), some(2)), some(1))
 */
export function getFirstMonoid<A = never>(): Monoid<Option<A>> {
  return {
    concat: (x, y) => (isNone(x) ? y : x),
    empty: none
  }
}

export const getLast = <Ts extends Option<any>[]>(
  ...items: Ts
): Option<AOfOptions<Ts>> => foldMonoid(getLastMonoid<AOfOptions<Ts>>())(items)

/**
 * Monoid returning the right-most non-`None` value
 *
 * | x       | y       | concat(x, y) |
 * | ------- | ------- | ------------ |
 * | none    | none    | none         |
 * | some(a) | none    | some(a)      |
 * | none    | some(a) | some(a)      |
 * | some(a) | some(b) | some(b)      |
 *
 * @example
 * import { getLastMonoid, some, none } from '@matechs/core/Option'
 *
 * const M = getLastMonoid<number>()
 * assert.deepStrictEqual(M.concat(none, none), none)
 * assert.deepStrictEqual(M.concat(some(1), none), some(1))
 * assert.deepStrictEqual(M.concat(none, some(1)), some(1))
 * assert.deepStrictEqual(M.concat(some(1), some(2)), some(2))
 */
export function getLastMonoid<A = never>(): Monoid<Option<A>> {
  return {
    concat: (x, y) => (isNone(y) ? x : y),
    empty: none
  }
}

/**
 * Returns an `E` value if possible
 *
 * @since 2.0.0
 */
export function getLeft<E, A>(ma: Either<E, A>): Option<E> {
  return ma._tag === "Right" ? none : some(ma.left)
}

/**
 * Monoid returning the left-most non-`None` value. If both operands are `Some`s then the inner values are
 * appended using the provided `Semigroup`
 *
 * | x       | y       | concat(x, y)       |
 * | ------- | ------- | ------------------ |
 * | none    | none    | none               |
 * | some(a) | none    | some(a)            |
 * | none    | some(a) | some(a)            |
 * | some(a) | some(b) | some(concat(a, b)) |
 *
 * @example
 * import { getMonoid, some, none } from '@matechs/core/Option'
 * import { semigroupSum } from '@matechs/core/Semigroup'
 *
 * const M = getMonoid(semigroupSum)
 * assert.deepStrictEqual(M.concat(none, none), none)
 * assert.deepStrictEqual(M.concat(some(1), none), some(1))
 * assert.deepStrictEqual(M.concat(none, some(1)), some(1))
 * assert.deepStrictEqual(M.concat(some(1), some(2)), some(3))
 */
export function getMonoid<A>(S: Semigroup<A>): Monoid<Option<A>> {
  return {
    concat: (x, y) =>
      isNone(x) ? y : isNone(y) ? x : some(S.concat(x.value, y.value)),
    empty: none
  }
}

/**
 * The `Ord` instance allows `Option` values to be compared with
 * `compare`, whenever there is an `Ord` instance for
 * the type the `Option` contains.
 *
 * `None` is considered to be less than any `Some` value.
 *
 *
 * @example
 * import { none, some, getOrd } from '@matechs/core/Option'
 * import { ordNumber } from '@matechs/core/Ord'
 *
 * const O = getOrd(ordNumber)
 * assert.strictEqual(O.compare(none, none), 0)
 * assert.strictEqual(O.compare(none, some(1)), -1)
 * assert.strictEqual(O.compare(some(1), none), 1)
 * assert.strictEqual(O.compare(some(1), some(2)), -1)
 * assert.strictEqual(O.compare(some(1), some(1)), 0)
 */
export function getOrd<A>(O: Ord<A>): Ord<Option<A>> {
  return {
    equals: getEq(O).equals,
    compare: (x, y) =>
      x === y ? 0 : isSome(x) ? (isSome(y) ? O.compare(x.value, y.value) : 1) : -1
  }
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @example
 * import { some, none, getOrElse } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     getOrElse(() => 0)
 *   ),
 *   1
 * )
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     getOrElse(() => 0)
 *   ),
 *   0
 * )
 */
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Effect<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Effect<S, R, E, A>>) => Effect<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Managed<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<Managed<S, R, E, A>>
) => Managed<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => Stream<S2, R2, E2, B>
): <S, R, E, A>(ma: Option<Stream<S, R, E, A>>) => Stream<S | S2, R & R2, E | E2, A | B>
export function getOrElse<S2, R2, E2, B>(
  onNone: () => StreamEither<S2, R2, E2, B>
): <S, R, E, A>(
  ma: Option<StreamEither<S, R, E, A>>
) => StreamEither<S | S2, R & R2, E | E2, A | B>
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B
export function getOrElse<A>(onNone: () => A): (ma: Option<A>) => A {
  return (o) => (o._tag === "None" ? onNone() : o.value)
}

export function getOrElse_<S, R, E, A, S2, R2, E2, B>(
  ma: Option<Effect<S, R, E, A>>,
  onNone: () => Effect<S2, R2, E2, B>
): Effect<S | S2, R & R2, E | E2, A | B>
export function getOrElse_<S, R, E, A, S2, R2, E2, B>(
  ma: Option<Managed<S, R, E, A>>,
  onNone: () => Managed<S2, R2, E2, B>
): Managed<S | S2, R & R2, E | E2, A | B>
export function getOrElse_<S, R, E, A, S2, R2, E2, B>(
  ma: Option<Stream<S, R, E, A>>,
  onNone: () => Stream<S2, R2, E2, B>
): Stream<S | S2, R & R2, E | E2, A | B>
export function getOrElse_<S, R, E, A, S2, R2, E2, B>(
  ma: Option<StreamEither<S, R, E, A>>,
  onNone: () => StreamEither<S2, R2, E2, B>
): StreamEither<S | S2, R & R2, E | E2, A | B>
export function getOrElse_<A, B>(ma: Option<A>, onNone: () => B): A | B
export function getOrElse_<A>(o: Option<A>, onNone: () => A): A {
  return o._tag === "None" ? onNone() : o.value
}

/**
 * Returns a `Refinement` (i.e. a custom type guard) from a `Option` returning function.
 * This function ensures that a custom type guard definition is type-safe.
 *
 * ```ts
 * import { some, none, getRefinement } from '@matechs/core/Option'
 *
 * type A = { type: 'A' }
 * type B = { type: 'B' }
 * type C = A | B
 *
 * const isA = (c: C): c is A => c.type === 'B' // <= typo but typescript doesn't complain
 * const isA = getRefinement<C, A>(c => (c.type === 'B' ? some(c) : none)) // static error: Type '"B"' is not assignable to type '"A"'
 * ```
 */
export function getRefinement<A, B extends A>(
  getOption: (a: A) => Option<B>
): Refinement<A, B> {
  return (a: A): a is B => isSome(getOption(a))
}

/**
 * Returns an `A` value if possible
 */
export function getRight<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === "Left" ? none : some(ma.right)
}

export function getShow<A>(S: Show<A>): Show<Option<A>> {
  return {
    show: (ma) => (isNone(ma) ? "none" : `some(${S.show(ma.value)})`)
  }
}

/**
 * Returns `true` if the option is `None`, `false` otherwise
 *
 * @example
 * import { some, none, isNone } from '@matechs/core/Option'
 *
 * assert.strictEqual(isNone(some(1)), false)
 * assert.strictEqual(isNone(none), true)
 */
export function isNone<A>(fa: Option<A>): fa is None {
  return fa._tag === "None"
}

/**
 * Returns `true` if the option is an instance of `Some`, `false` otherwise
 *
 * @example
 * import { some, none, isSome } from '@matechs/core/Option'
 *
 * assert.strictEqual(isSome(some(1)), true)
 * assert.strictEqual(isSome(none), false)
 */
export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === "Some"
}

export const map_: <A, B>(fa: Option<A>, f: (a: A) => B) => Option<B> = (ma, f) =>
  isNone(ma) ? none : some(f(ma.value))

export const map: <A, B>(f: (a: A) => B) => (fa: Option<A>) => Option<B> = (f) => (
  fa
) => map_(fa, f)

/**
 * This is `chain` + `fromNullable`, useful when working with optional values
 *
 * @example
 * import { some, none, fromNullable, mapNullable } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * interface Employee {
 *   company?: {
 *     address?: {
 *       street?: {
 *         name?: string
 *       }
 *     }
 *   }
 * }
 *
 * const employee1: Employee = { company: { address: { street: { name: 'high street' } } } }
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     fromNullable(employee1.company),
 *     mapNullable(company => company.address),
 *     mapNullable(address => address.street),
 *     mapNullable(street => street.name)
 *   ),
 *   some('high street')
 * )
 *
 * const employee2: Employee = { company: { address: { street: {} } } }
 *
 * assert.deepStrictEqual(
 *   pipe(
 *     fromNullable(employee2.company),
 *     mapNullable(company => company.address),
 *     mapNullable(address => address.street),
 *     mapNullable(street => street.name)
 *   ),
 *   none
 * )
 */
export function mapNullable<A, B>(
  f: (a: A) => B | null | undefined
): (ma: Option<A>) => Option<B> {
  return (ma) => (isNone(ma) ? none : fromNullable(f(ma.value)))
}

export const partition: CPartition1<URI> = <A>(predicate: Predicate<A>) => (
  fa: Option<A>
) => ({
  left: filter((a: A) => !predicate(a))(fa),
  right: filter(predicate)(fa)
})

export const partition_: Partition1<URI> = <A>(
  fa: Option<A>,
  predicate: Predicate<A>
) => ({
  left: filter((a: A) => !predicate(a))(fa),
  right: filter(predicate)(fa)
})

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: Option<A>) => Separated<Option<B>, Option<C>> = (f) => (fa) =>
  separate(map_(fa, f))

export const partitionMap_: <A, B, C>(
  fa: Option<A>,
  f: (a: A) => Either<B, C>
) => Separated<Option<B>, Option<C>> = (fa, f) => separate(map_(fa, f))

export const reduce: <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Option<A>) => B = (
  b,
  f
) => (fa) => (isNone(fa) ? b : f(b, fa.value))

export const reduce_: <A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => (isNone(fa) ? b : f(b, fa.value))

export const reduceRight: <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Option<A>) => B = (
  b,
  f
) => reduce(b, (b_, a_) => f(a_, b_))

export const reduceRight_: <A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B) => B = (
  fa,
  b,
  f
) => reduce_(fa, b, (b_, a_) => f(a_, b_))

const defaultSeparate = { left: none, right: none }

export const separate = <A, B>(
  ma: Option<Either<A, B>>
): Separated<Option<A>, Option<B>> => {
  const o = map_(ma, (e) => ({
    left: getLeft(e),
    right: getRight(e)
  }))
  return isNone(o) ? defaultSeparate : o.value
}

export const sequence: CSequence1<URI> = <F>(F: CApplicative<F>) => <A>(
  ta: Option<HKT<F, A>>
): HKT<F, Option<A>> => {
  return isNone(ta) ? F.of(none) : F.map(some)(ta.value)
}

export function some<A>(a: A): Option<A> {
  return { _tag: "Some", value: a }
}

export const throwError = <E>(_: E) => none

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @example
 * import { some, none, toNullable } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     toNullable
 *   ),
 *   1
 * )
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     toNullable
 *   ),
 *   null
 * )
 */
export function toNullable<A>(ma: Option<A>): A | null {
  return isNone(ma) ? null : ma.value
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 *
 * @example
 * import { some, none, toUndefined } from '@matechs/core/Option'
 * import { pipe } from '@matechs/core/Function'
 *
 * assert.strictEqual(
 *   pipe(
 *     some(1),
 *     toUndefined
 *   ),
 *   1
 * )
 * assert.strictEqual(
 *   pipe(
 *     none,
 *     toUndefined
 *   ),
 *   undefined
 * )
 */
export function toUndefined<A>(ma: Option<A>): A | undefined {
  return isNone(ma) ? undefined : ma.value
}

export const traverse: CTraverse1<URI> = <F>(F: CApplicative<F>) => <A, B>(
  f: (a: A) => HKT<F, B>
): ((ta: Option<A>) => HKT<F, Option<B>>) => {
  return (ta) => (isNone(ta) ? F.of(none) : F.map(some)(f(ta.value)))
}

export const traverse_: Traverse1<URI> = <F>(F: CApplicative<F>) => <A, B>(
  ta: Option<A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Option<B>> => {
  return isNone(ta) ? F.of(none) : F.map(some)(f(ta.value))
}

/**
 * Transforms an exception into an `Option`. If `f` throws, returns `None`, otherwise returns the output wrapped in
 * `Some`
 *
 * @example
 * import { none, some, tryCatch } from '@matechs/core/Option'
 *
 * assert.deepStrictEqual(
 *   tryCatch(() => {
 *     throw new Error()
 *   }),
 *   none
 * )
 * assert.deepStrictEqual(tryCatch(() => 1), some(1))
 */
export function tryCatch<A>(f: Lazy<A>): Option<A> {
  try {
    return some(f())
  } catch (e) {
    return none
  }
}

export const wilt: CWilt1<URI> = <F>(F: CApplicative<F>) => <A, B, C>(
  f: (a: A) => HKT<F, Either<B, C>>
): ((fa: Option<A>) => HKT<F, Separated<Option<B>, Option<C>>>) => {
  return (fa) => {
    const o = map_(fa, (a) =>
      F.map((e: Either<B, C>) => ({
        left: getLeft(e),
        right: getRight(e)
      }))(f(a))
    )
    return isNone(o)
      ? F.of({
          left: none,
          right: none
        })
      : o.value
  }
}

export const wilt_: Wilt1<URI> = <F>(F: CApplicative<F>) => <A, B, C>(
  fa: Option<A>,
  f: (a: A) => HKT<F, Either<B, C>>
): HKT<F, Separated<Option<B>, Option<C>>> => {
  const o = map_(fa, (a) =>
    F.map((e: Either<B, C>) => ({
      left: getLeft(e),
      right: getRight(e)
    }))(f(a))
  )
  return isNone(o)
    ? F.of({
        left: none,
        right: none
      })
    : o.value
}

export const wither: CWither1<URI> = <F>(F: CApplicative<F>) => <A, B>(
  f: (a: A) => HKT<F, Option<B>>
): ((fa: Option<A>) => HKT<F, Option<B>>) => (fa) =>
  isNone(fa) ? F.of(none) : f(fa.value)

export const wither_: Wither1<URI> = <F>(F: CApplicative<F>) => <A, B>(
  fa: Option<A>,
  f: (a: A) => HKT<F, Option<B>>
): HKT<F, Option<B>> => (isNone(fa) ? F.of(none) : f(fa.value))

export const zero = () => none

export const option: CMonad1<URI> &
  CFoldable1<URI> &
  CTraversable1<URI> &
  CAlternative1<URI> &
  CExtend1<URI> &
  CCompactable1<URI> &
  CFilterable1<URI> &
  CWitherable1<URI> &
  CApplicative1<URI> = {
  URI,
  map,
  of: some,
  ap,
  chain,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  zero,
  alt,
  extend,
  compact,
  separate,
  filter,
  filterMap,
  partition,
  partitionMap,
  wither,
  wilt
}

export const optionMonad: CMonad1<URI> & CApplicative1<URI> = {
  URI,
  map,
  of: some,
  ap,
  chain
}

export const optionAp: CApplicative1<URI> = {
  URI,
  map,
  of: some,
  ap
}

export const Do = () => DoG(optionMonad)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(optionAp))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(optionAp))()

//
// Compatibility with fp-ts ecosystem
//

export const option_: Monad1<URI> &
  Foldable1<URI> &
  Traversable1<URI> &
  Alternative1<URI> &
  Extend1<URI> &
  Compactable1<URI> &
  Filterable1<URI> &
  Witherable1<URI> &
  Applicative1<URI> = {
  URI,
  of: some,
  map: map_,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: <F>(F: Applicative<F>) => <A, B>(
    ta: Option<A>,
    f: (a: A) => HKT<F, B>
  ): HKT<F, Option<B>> => {
    return isNone(ta) ? F.of(none) : F.map(f(ta.value), some)
  },
  sequence: <F>(F: Applicative<F>) => <A>(ta: Option<HKT<F, A>>): HKT<F, Option<A>> => {
    return isNone(ta) ? F.of(none) : F.map(ta.value, some)
  },
  zero,
  alt: alt_,
  extend: extend_,
  compact,
  separate,
  filter: filter_,
  filterMap: filterMap_,
  partition: partition_,
  partitionMap: partitionMap_,
  wither: <F>(F: Applicative<F>) => <A, B>(
    fa: Option<A>,
    f: (a: A) => HKT<F, Option<B>>
  ): HKT<F, Option<B>> => (isNone(fa) ? F.of(none) : f(fa.value)),
  wilt: <F>(F: Applicative<F>) => <A, B, C>(
    fa: Option<A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ): HKT<F, Separated<Option<B>, Option<C>>> => {
    const o = map_(fa, (a) =>
      F.map(f(a), (e: Either<B, C>) => ({
        left: getLeft(e),
        right: getRight(e)
      }))
    )
    return isNone(o)
      ? F.of({
          left: none,
          right: none
        })
      : o.value
  }
}
