// ets_tracing: off

/* adapted from https://github.com/gcanti/fp-ts */

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Either } from "../Either/core.js"
import type { Lazy, Predicate, Refinement } from "../Function/core.js"
import { identity } from "../Function/core.js"
import * as St from "../Structural/index.js"
import type { HasUnify } from "../Utils/index.js"

const _noneHash = St.hashString("@effect-ts/system/Option/None")
const _someHash = St.hashString("@effect-ts/system/Option/Some")

/**
 * Definitions
 */
export class None implements HasUnify {
  readonly _tag = "None";

  [St.equalsSym](that: unknown): boolean {
    return that instanceof None
  }
  get [St.hashSym](): number {
    return _noneHash
  }
}

export class Some<A> implements HasUnify {
  readonly _tag = "Some"
  constructor(readonly value: A) {}

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Some && St.equals(this.value, that.value)
  }
  get [St.hashSym](): number {
    return St.combineHash(_someHash, St.hash(this.value))
  }
}

export type Option<A> = None | Some<A>

/**
 * Constructs none
 */
export const none: Option<never> = new None()

/**
 * Constructs none
 */
export function emptyOf<A>(): Option<A> {
  return none
}

/**
 * Constructs Some(A)
 */
export function some<A>(a: A): Option<A> {
  return new Some(a)
}

/**
 * Classic applicative
 */
export function ap_<A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> {
  return isNone(fab) ? none : isNone(fa) ? none : some(fab.value(fa.value))
}

/**
 * Classic applicative
 *
 * @ets_data_first ap_
 */
export function ap<A>(fa: Option<A>) {
  return <B>(fab: Option<(a: A) => B>): Option<B> => ap_(fab, fa)
}

/**
 * Zips `Option[A]` and `Option[B]` into `Option[(A, B)]`
 */
export function zip_<A, B>(fa: Option<A>, fb: Option<B>): Option<Tp.Tuple<[A, B]>> {
  return chain_(fa, (a) => map_(fb, (b) => Tp.tuple(a, b)))
}

/**
 * Zips `Option[A]` and `Option[B]` into `Option[(A, B)]`
 *
 * @ets_data_first zip_
 */
export function zip<B>(fb: Option<B>) {
  return <A>(fa: Option<A>): Option<Tp.Tuple<[A, B]>> => zip_(fa, fb)
}

/**
 * Apply both and return first
 *
 * @ets_data_first zipFirst_
 */
export function zipFirst<B>(fb: Option<B>) {
  return <A>(fa: Option<A>): Option<A> => zipFirst_(fa, fb)
}

/**
 * Apply both and return first
 */
export function zipFirst_<A, B>(fa: Option<A>, fb: Option<B>): Option<A> {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

/**
 * Apply both and return second
 *
 * @ets_data_first zipSecond_
 */
export function zipSecond<B>(fb: Option<B>) {
  return <A>(fa: Option<A>): Option<B> => zipSecond_(fa, fb)
}

/**
 * Apply both and return second
 */
export function zipSecond_<A, B>(fa: Option<A>, fb: Option<B>): Option<B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * Builds a new option constructed using the value of self
 */
export function chain_<A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B> {
  return isNone(self) ? none : f(self.value)
}

/**
 * Builds a new option constructed using the value of self
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => Option<B>) {
  return (self: Option<A>): Option<B> => chain_(self, f)
}

/**
 * Like chain but ignores the constructed outout
 *
 * @ets_data_first tap_
 */
export function tap<A>(f: (a: A) => Option<any>) {
  return (ma: Option<A>): Option<A> => chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * Like chain but ignores the constructed outout
 */
export function tap_<A>(ma: Option<A>, f: (a: A) => Option<any>): Option<A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * Flattens nested options
 */
export function flatten<A>(fa: Option<Option<A>>): Option<A> {
  return chain_(fa, identity)
}

/**
 * Wraps this option into a second one
 */
export function duplicate<A>(ma: Option<A>): Option<Option<A>> {
  return isNone(ma) ? none : some(ma)
}

/**
 * Returns `true` if the predicate is satisfied by the wrapped value
 *
 * @ets_data_first exists_
 */
export function exists<A>(predicate: Predicate<A>): (ma: Option<A>) => boolean {
  return (ma) => (isNone(ma) ? false : predicate(ma.value))
}

/**
 * Returns `true` if the predicate is satisfied by the wrapped value
 */
export function exists_<A>(ma: Option<A>, predicate: Predicate<A>): boolean {
  return isNone(ma) ? false : predicate(ma.value)
}

/**
 * Apply `Option[A] => B` in case self is some returning `Option[B]`
 *
 * @ets_data_first extend_
 */
export function extend<A, B>(f: (fa: Option<A>) => B) {
  return (self: Option<A>): Option<B> => extend_(self, f)
}

/**
 * Apply `Option[A] => B` in case self is some returning `Option[B]`
 */
export function extend_<A, B>(self: Option<A>, f: (fa: Option<A>) => B): Option<B> {
  return isNone(self) ? none : some(f(self))
}

/**
 * Takes a default value, a function, and an `Option` value, if the `Option` value is `None` the default value is
 * returned, otherwise the function is applied to the value inside the `Some` and the result is returned.
 *
 * @ets_data_first fold_
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
export function fromEither<E, A>(ma: Either<E, A>): Option<A> {
  return ma._tag === "Left" ? none : some(ma.right)
}

/**
 * Constructs a new `Option` from a nullable type. If the value is `null` or `undefined`, returns `None`, otherwise
 * returns the value wrapped in a `Some`
 */
export function fromNullable<A>(a: A): Option<NonNullable<A>> {
  return a == null ? none : some(a as NonNullable<A>)
}

/**
 * Returns a smart constructor based on the given predicate
 *
 * @ets_data_first fromPredicate_
 */
export function fromPredicate<A, B extends A>(
  refinement: Refinement<A, B>
): (a: A) => Option<B>
/**
 * Returns a smart constructor based on the given predicate
 *
 * @ets_data_first fromPredicate_
 */
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A>
/**
 * Returns a smart constructor based on the given predicate
 *
 * @ets_data_first fromPredicate_
 */
export function fromPredicate<A>(predicate: Predicate<A>): (a: A) => Option<A> {
  return (a) => (predicate(a) ? some(a) : none)
}

/**
 * Returns a smart constructor based on the given predicate
 */
export function fromPredicate_<A, B extends A>(
  a: A,
  refinement: Refinement<A, B>
): Option<B>
/**
 * Returns a smart constructor based on the given predicate
 */
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A>
/**
 * Returns a smart constructor based on the given predicate
 */
export function fromPredicate_<A>(a: A, predicate: Predicate<A>): Option<A> {
  return predicate(a) ? some(a) : none
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
 * @ets_data_first getOrElse_
 */
export function getOrElse<B>(onNone: () => B): <A>(ma: Option<A>) => A | B {
  return (o) => getOrElse_(o, onNone)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 *
 * @ets_data_first getOrElseS_
 */
export function getOrElseS<B>(onNone: () => B): (ma: Option<B>) => B {
  return getOrElse(onNone)
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 */
export function getOrElse_<A, B>(ma: Option<A>, onNone: () => B): A | B {
  return ma._tag === "None" ? onNone() : ma.value
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns the given default value
 */
export function getOrElseS_<A>(ma: Option<A>, onNone: () => A): A {
  return getOrElse_(ma, onNone)
}

/**
 * Returns a `Refinement` (i.e. a custom type guard) from a `Option` returning function.
 * This function ensures that a custom type guard definition is type-safe.
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
 */
export function isNone<A>(fa: Option<A>): fa is None {
  return fa._tag === "None"
}

/**
 * Returns `true` if the option is an instance of `Some`, `false` otherwise
 */
export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === "Some"
}

/**
 * Use `A => B` to transform `Option[A]` to `Option[B]`
 */
export function map_<A, B>(ma: Option<A>, f: (a: A) => B): Option<B> {
  return isNone(ma) ? none : some(f(ma.value))
}

/**
 * Use `A => B` to transform `Option[A]` to `Option[B]`
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (fa: Option<A>): Option<B> => map_(fa, f)
}

/**
 * This is `chain` + `fromNullable`, useful when working with optional values
 */
export function mapNullable<A, B>(
  f: (a: A) => B | null | undefined
): (ma: Option<A>) => Option<B> {
  return (ma) => (isNone(ma) ? none : fromNullable(f(ma.value)))
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `null`.
 */
export function toNullable<A>(ma: Option<A>): A | null {
  return isNone(ma) ? null : ma.value
}

/**
 * Extracts the value out of the structure, if it exists. Otherwise returns `undefined`.
 */
export function toUndefined<A>(ma: Option<A>): A | undefined {
  return isNone(ma) ? undefined : ma.value
}

/**
 * Transforms an exception into an `Option`. If `f` throws, returns `None`, otherwise returns the output wrapped in
 * `Some`
 */
export function tryCatch<A>(f: Lazy<A>): Option<A> {
  try {
    return some(f())
  } catch (e) {
    return none
  }
}

export const PartialExceptionTypeId = Symbol()
export type PartialExceptionTypeId = typeof PartialExceptionTypeId

export class PartialException {
  readonly _typeId: PartialExceptionTypeId = PartialExceptionTypeId
}

function raisePartial<X>(): X {
  throw new PartialException()
}

/**
 * Simulates a partial function
 */
export function partial<ARGS extends any[], A>(
  f: (miss: <X>() => X) => (...args: ARGS) => A
): (...args: ARGS) => Option<A> {
  return (...args) => {
    try {
      return some(f(raisePartial)(...args))
    } catch (e) {
      if (e instanceof PartialException) {
        return none
      }
      throw e
    }
  }
}
