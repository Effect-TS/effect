/* adapted from https://github.com/gcanti/fp-ts */

import type { Either } from "../Either/core"
import { identity, Lazy, Predicate, Refinement } from "../Function/core"

/**
 * Definitions
 */
export interface None {
  readonly _tag: "None"
}

export interface Some<A> {
  readonly _tag: "Some"
  readonly value: A
}

export type Option<A> = None | Some<A>

/**
 * Constructs none
 */
export const none: Option<never> = { _tag: "None" }

/**
 * Constructs Some(A)
 */
export function some<A>(a: A): Option<A> {
  return { _tag: "Some", value: a }
}

/**
 * Alternative that if self is none
 */
export const alt_: <A>(self: Option<A>, that: () => Option<A>) => Option<A> = (ma, f) =>
  isNone(ma) ? f() : ma

/**
 * Alternative that if self is none
 */
export const alt: <A>(that: () => Option<A>) => (fa: Option<A>) => Option<A> = (
  that
) => (fa) => (isNone(fa) ? that() : fa)

/**
 * Classic applicative
 */
export const ap_: <A, B>(fab: Option<(a: A) => B>, fa: Option<A>) => Option<B> = (
  mab,
  ma
) => (isNone(mab) ? none : isNone(ma) ? none : some(mab.value(ma.value)))

/**
 * Classic applicative
 */
export const ap: <A>(fa: Option<A>) => <B>(fab: Option<(a: A) => B>) => Option<B> = (
  fa
) => (fab) => ap_(fab, fa)

/**
 * Apply both and return first
 */
export const zipFirst: <B>(fb: Option<B>) => <A>(fa: Option<A>) => Option<A> = (fb) => (
  fa
) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

/**
 * Apply both and return second
 */
export const zipSecond = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

/**
 * Builds a new option constructed using the value of self
 */
export const chain_: <A, B>(self: Option<A>, f: (a: A) => Option<B>) => Option<B> = (
  ma,
  f
) => (isNone(ma) ? none : f(ma.value))

/**
 * Builds a new option constructed using the value of self
 */
export const chain: <A, B>(f: (a: A) => Option<B>) => (self: Option<A>) => Option<B> = (
  f
) => (ma) => chain_(ma, f)

/**
 * Like chain but ignores the constructed outout
 */
export const tap = <A>(f: (a: A) => Option<any>) => (ma: Option<A>): Option<A> =>
  chain_(ma, (a) => map_(f(a), () => a))

/**
 * Like chain but ignores the constructed outout
 */
export const tap_ = <A>(ma: Option<A>, f: (a: A) => Option<any>): Option<A> =>
  chain_(ma, (a) => map_(f(a), () => a))

/**
 * Flattens nested options
 */
export const flatten = <A>(fa: Option<Option<A>>): Option<A> => chain_(fa, identity)

/**
 * Wraps this option into a second one
 */
export const duplicate: <A>(ma: Option<A>) => Option<Option<A>> = (ma) =>
  isNone(ma) ? none : some(ma)

/**
 * Returns `true` if the predicate is satisfied by the wrapped value
 *
 * @example
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

/**
 * Apply `Option[A] => B` in case self is some returning `Option[B]`
 */
export const extend = <A, B>(f: (fa: Option<A>) => B) => (self: Option<A>): Option<B> =>
  extend_(self, f)

/**
 * Apply `Option[A] => B` in case self is some returning `Option[B]`
 */
export const extend_ = <A, B>(self: Option<A>, f: (fa: Option<A>) => B): Option<B> =>
  isNone(self) ? none : some(f(self))

/**
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `None` the default value is
 * returned, otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @example
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
export function fold<A, B, C>(
  onNone: () => B,
  onSome: (a: A) => C
): (ma: Option<A>) => B | C {
  return (ma) => fold_(ma, onNone, onSome)
}

/**
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `None` the default value is
 * returned, otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @example
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
export function fold_<A, B, C>(
  ma: Option<A>,
  onNone: () => B,
  onSome: (a: A) => C
): B | C {
  return isNone(ma) ? onNone() : onSome(ma.value)
}

/**
 * Constructs `Option[A]` from `Either[E, A]` discarding `E`
 */
export const fromEither: <E, A>(ma: Either<E, A>) => Option<A> = (ma) =>
  ma._tag === "Left" ? none : some(ma.right)

/**
 * Constructs a new `Option` from a nullable type. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`
 *
 * @example
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

/**
 * Returns an `E` value if possible
 */
export function getLeft<E, A>(ma: Either<E, A>): Option<E> {
  return ma._tag === "Right" ? none : some(ma.left)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @example
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
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B {
  return (o) => getOrElse_(o, onNone)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @example
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
export function getOrElse_<A, B>(ma: Option<A>, onNone: () => B): A | B {
  return ma._tag === "None" ? onNone() : ma.value
}

/**
 * Returns a `Refinement` (i.e. a custom type guard) from a `Option` returning function.
 * This function ensures that a custom type guard definition is type-safe.
 *
 * ```ts
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

/**
 * Returns `true` if the option is `None`, `false` otherwise
 *
 * @example
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
 * assert.strictEqual(isSome(some(1)), true)
 * assert.strictEqual(isSome(none), false)
 */
export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === "Some"
}

/**
 * Use `A => B` to transform `Option[A]` to `Option[B]`
 */
export const map_: <A, B>(fa: Option<A>, f: (a: A) => B) => Option<B> = (ma, f) =>
  isNone(ma) ? none : some(f(ma.value))

/**
 * Use `A => B` to transform `Option[A]` to `Option[B]`
 */
export const map: <A, B>(f: (a: A) => B) => (fa: Option<A>) => Option<B> = (f) => (
  fa
) => map_(fa, f)

/**
 * This is `chain` + `fromNullable`, useful when working with optional values
 *
 * @example
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

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 *
 * @example
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

/**
 * Transforms an exception into an `Option`. If `f` throws, returns `None`, otherwise returns the output wrapped in
 * `Some`
 *
 * @example
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
