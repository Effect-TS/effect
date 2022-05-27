// ets_tracing: off

/**
 * adapted from https://github.com/gcanti/fp-ts
 */
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import type { Lazy, Predicate, Refinement } from "../Function/core.js"
import type { Option } from "../Option/core.js"
import { isNone } from "../Option/core.js"
import * as St from "../Structural/index.js"

const _leftHash = St.hashString("@effect-ts/system/Either/Left")
const _rightHash = St.hashString("@effect-ts/system/Either/Right")

/**
 * Definitions
 */
export class Left<E> {
  readonly _tag = "Left"
  constructor(readonly left: E) {}

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Left && St.equals(this.left, that.left)
  }
  get [St.hashSym](): number {
    return St.combineHash(_leftHash, St.hash(this.left))
  }
}

export class Right<A> {
  readonly _tag = "Right"
  constructor(readonly right: A) {}

  [St.equalsSym](that: unknown): boolean {
    return that instanceof Right && St.equals(this.right, that.right)
  }
  get [St.hashSym](): number {
    return St.combineHash(_rightHash, St.hash(this.right))
  }
}

export type Either<E, A> = Left<E> | Right<A>

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 */
export function right<A>(a: A): Either<never, A> {
  return new Right(a)
}

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 */
export function rightW<A, E = never>(a: A): Either<E, A> {
  return new Right(a)
}

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 */
export function left<E>(e: E): Either<E, never> {
  return new Left(e)
}

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 */
export function leftW<E, A = never>(e: E): Either<E, A> {
  return new Left(e)
}

/**
 * Widen left side `Either[E, A] => Either[E | E1, A]`
 */
export function widenE<E1>() {
  return (
    /**
     * @ets_optimize identity
     */
    <E, A>(self: Either<E, A>): Either<E | E1, A> => self
  )
}

/**
 * Widen right side `Either[E, A] => Either[E, A | A1]`
 */
export function widenA<A1>() {
  return (
    /**
     * @ets_optimize identity
     */
    <E, A>(self: Either<E, A>): Either<E, A | A1> => self
  )
}

/**
 * Alternatively construct `that` if `self` is left
 */
export function alt_<E, E2, A, A2>(
  self: Either<E, A>,
  that: () => Either<E2, A2>
): Either<E | E2, A | A2> {
  return isLeft(self) ? that() : self
}

/**
 * Alternatively construct `that` if `self` is left
 *
 * @ets_data_first alt_
 */
export function alt<E, A>(that: () => Either<E, A>) {
  return <E2, A2>(self: Either<E2, A2>): Either<E | E2, A | A2> => alt_(self, that)
}

/**
 * Classic Applicative
 */
export function ap_<E, A, B, E2>(
  fab: Either<E, (a: A) => B>,
  fa: Either<E2, A>
): Either<E | E2, B> {
  return isLeft(fab) ? fab : isLeft(fa) ? fa : right(fab.right(fa.right))
}

/**
 * Classic Applicative
 *
 * @ets_data_first ap_
 */
export function ap<E, A>(fa: Either<E, A>) {
  return <E2, B>(fab: Either<E2, (a: A) => B>): Either<E | E2, B> => ap_(fab, fa)
}

/**
 * Apply both and return both
 */
export function zip_<E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
): Either<E | E2, Tp.Tuple<[A, B]>> {
  return chain_(fa, (a) => map_(fb, (b) => Tp.tuple(a, b)))
}

/**
 * Apply both and return both
 *
 * @ets_data_first zip_
 */
export function zip<E, B>(fb: Either<E, B>) {
  return <E2, A>(fa: Either<E2, A>): Either<E | E2, Tp.Tuple<[A, B]>> => zip_(fa, fb)
}

/**
 * Apply both and return first
 *
 * @ets_data_first zipFirst_
 */
export function zipFirst<E, B>(fb: Either<E, B>) {
  return <E2, A>(fa: Either<E2, A>): Either<E | E2, A> => zipFirst_(fa, fb)
}

/**
 * Apply both and return first
 */
export function zipFirst_<E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
): Either<E | E2, A> {
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
export function zipSecond<E, B>(fb: Either<E, B>) {
  return <E2, A>(fa: Either<E2, A>): Either<E | E2, B> => zipSecond_(fa, fb)
}

/**
 * Apply both and return second
 */
export function zipSecond_<E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
): Either<E | E2, B> {
  return ap_(
    map_(fa, () => (b: B) => b),
    fb
  )
}

/**
 * Maps both left and right
 */
export function bimap_<E, A, G, B>(
  fea: Either<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): Either<G, B> {
  return isLeft(fea) ? left(f(fea.left)) : right(g(fea.right))
}

/**
 * Maps both left and right
 *
 * @ets_data_first bimap_
 */
export function bimap<E, G, A, B>(f: (e: E) => G, g: (a: A) => B) {
  return (fa: Either<E, A>): Either<G, B> => bimap_(fa, f, g)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export function chain_<E, A, B, E2>(
  fa: Either<E, A>,
  f: (a: A) => Either<E2, B>
): Either<E | E2, B> {
  return isLeft(fa) ? fa : f(fa.right)
}

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 *
 * @ets_data_first chain_
 */
export function chain<E, A, B>(f: (a: A) => Either<E, B>) {
  return <E2>(ma: Either<E2, A>): Either<E | E2, B> => chain_(ma, f)
}

/**
 * Like chain but ignores the constructed outout
 *
 * @ets_data_first tap_
 */
export function tap<E, A, B>(f: (a: A) => Either<E, B>) {
  return <E2>(ma: Either<E2, A>): Either<E | E2, A> =>
    chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * Like chain but ignores the constructed outout
 */
export function tap_<E2, E, A, B>(
  ma: Either<E2, A>,
  f: (a: A) => Either<E, B>
): Either<E | E2, A> {
  return chain_(ma, (a) => map_(f(a), () => a))
}

/**
 * Self embed `Either[E, A]` into `Either[E, Either[E, A]]`
 */
export function duplicate<E, A>(ma: Either<E, A>): Either<E, Either<E, A>> {
  return extend_(ma, (x) => x)
}

/**
 * Returns `false` if `Left` or returns the result of the application of the given predicate to the `Right` value.
 *
 * @ets_data_first exists_
 */
export function exists<A>(predicate: Predicate<A>): <E>(ma: Either<E, A>) => boolean {
  return (ma) => (isLeft(ma) ? false : predicate(ma.right))
}

/**
 * Returns `false` if `Left` or returns the result of the application of the given predicate to the `Right` value.
 */
export function exists_<E, A>(ma: Either<E, A>, predicate: Predicate<A>): boolean {
  return isLeft(ma) ? false : predicate(ma.right)
}

/**
 * Apply `Either[E, A] => B` in case `self` is `Right` returning `Either[E, B]`
 */
export function extend_<E, A, B>(
  self: Either<E, A>,
  f: (wa: Either<E, A>) => B
): Either<E, B> {
  return isLeft(self) ? self : right(f(self))
}

/**
 * Apply `Either[E, A] => B` in case `self` is `Right` returning `Either[E, B]`
 *
 * @ets_data_first extend_
 */
export function extend<E, A, B>(f: (fa: Either<E, A>) => B) {
  return (self: Either<E, A>): Either<E, B> => extend_(self, f)
}

/**
 * Apply predicate to `A` and construct `E` in case the predicate is `false`
 *
 * @ets_data_first filterOrElse_
 */
export function filterOrElse<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): <E2>(ma: Either<E2, A>) => Either<E | E2, B>
export function filterOrElse<E, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): <E2>(ma: Either<E2, A>) => Either<E | E2, A>
export function filterOrElse<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) {
  return (ma: Either<E, A>): Either<E, A> =>
    chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))))
}

/**
 * Apply predicate to `A` and construct `E` in case the predicate is `false`
 */
export function filterOrElse_<E, E2, A, B extends A>(
  ma: Either<E2, A>,
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): Either<E | E2, B>
export function filterOrElse_<E, E2, A>(
  ma: Either<E2, A>,
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): Either<E | E2, A>
export function filterOrElse_<E, A>(
  ma: Either<E, A>,
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): Either<E, A> {
  return chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))))
}

/**
 * Flatten nested `Either[E, Either[E1, A]]` into `Either[E | E1, A]`
 */
export function flatten<E, E2, A>(mma: Either<E, Either<E2, A>>): Either<E | E2, A> {
  return chain_(mma, (x) => x)
}

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, B, C>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): (ma: Either<E, A>) => B | C {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : onRight(ma.right))
}

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 */
export function fold_<E, A, B, C>(
  ma: Either<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): B | C {
  return isLeft(ma) ? onLeft(ma.left) : onRight(ma.right)
}

/**
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`
 *
 * @ets_data_first fromNullable_
 */
export function fromNullable<E>(e: Lazy<E>): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A) => (a == null ? left(e()) : right(a as NonNullable<A>))
}

/**
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`
 */
export function fromNullable_<A, E>(a: A, e: Lazy<E>): Either<E, NonNullable<A>> {
  return a == null ? left(e()) : right(a as NonNullable<A>)
}

/**
 * Construct `Either[E, A]` from `Option[A]` constructing `E` with `onNone`
 *
 * @ets_data_first fromOption_
 */
export function fromOption<E>(onNone: () => E) {
  return <A>(ma: Option<A>): Either<E, A> =>
    isNone(ma) ? left(onNone()) : right(ma.value)
}

/**
 * Construct `Either[E, A]` from `Option[A]` constructing `E` with `onNone`
 */
export function fromOption_<A, E>(ma: Option<A>, onNone: () => E): Either<E, A> {
  return isNone(ma) ? left(onNone()) : right(ma.value)
}

/**
 * Construct `Either[E, A]` by applying a predicate to `A` and constructing
 * `E` if the predicate is false
 *
 * @ets_data_first fromPredicate_
 */
export function fromPredicate<E, A, B extends A>(
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): (a: A) => Either<E, B>
export function fromPredicate<E, A>(
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): (a: A) => Either<E, A>
export function fromPredicate<E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) {
  return (a: A): Either<E, A> => (predicate(a) ? right(a) : left(onFalse(a)))
}

/**
 * Construct `Either[E, A]` by applying a predicate to `A` and constructing
 * `E` if the predicate is false
 */
export function fromPredicate_<E, A, B extends A>(
  a: A,
  refinement: Refinement<A, B>,
  onFalse: (a: A) => E
): Either<E, B>
export function fromPredicate_<E, A>(
  a: A,
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): Either<E, A>
export function fromPredicate_<E, A>(
  a: A,
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): Either<E, A> {
  return predicate(a) ? right(a) : left(onFalse(a))
}

/**
 * Get `A` or in case self is left return `onLeft` result
 *
 * @ets_data_first getOrElse_
 */
export function getOrElse<E, A>(onLeft: (e: E) => A): <B>(self: Either<E, B>) => A | B {
  return (ma) => getOrElse_(ma, onLeft)
}

/**
 * Get `A` or in case self is left return `onLeft` result
 */
export function getOrElse_<E, A, B>(self: Either<E, B>, onLeft: (e: E) => A): A | B {
  return isLeft(self) ? onLeft(self.left) : self.right
}

/**
 * Returns `true` if the either is an instance of `Left`, `false` otherwise
 */
export function isLeft<E, A>(ma: Either<E, A>): ma is Left<E> {
  switch (ma._tag) {
    case "Left":
      return true
    case "Right":
      return false
  }
}

/**
 * Returns `true` if the either is an instance of `Right`, `false` otherwise
 */
export function isRight<E, A>(ma: Either<E, A>): ma is Right<A> {
  return ma._tag === "Right" ? true : false
}

/**
 * Use `A => B` to transform `Either[E, A]` to `Either[E, B]`
 */
export function map_<E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> {
  return isLeft(fa) ? fa : right(f(fa.right))
}

/**
 * Use `A => B` to transform `Either[E, A]` to `Either[E, B]`
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(fa: Either<E, A>): Either<E, B> => map_(fa, f)
}

/**
 * Use `E => E1` to transform `Either[E, A]` to `Either[E1, A]`
 */
export function mapLeft_<E, A, G>(fea: Either<E, A>, f: (e: E) => G): Either<G, A> {
  return isLeft(fea) ? left(f(fea.left)) : fea
}

/**
 * Use `E => E1` to transform `Either[E, A]` to `Either[E1, A]`
 *
 * @ets_data_first mapLeft_
 */
export function mapLeft<E, G>(f: (e: E) => G) {
  return <A>(fa: Either<E, A>): Either<G, A> => mapLeft_(fa, f)
}

/**
 * Merges `Left<E> | Right<B>` into `A | B`
 */
export function merge<E, A>(self: Either<E, A>): E | A {
  return fold_(
    self,
    (x) => x,
    (x) => x
  )
}

/**
 * Alternatively run onLeft
 *
 * @ets_data_first orElse_
 */
export function orElse<E, A, M>(
  onLeft: (e: E) => Either<M, A>
): <B>(ma: Either<E, B>) => Either<M, A | B> {
  return (ma) => orElse_(ma, onLeft)
}

/**
 * Alternatively run onLeft
 */
export function orElse_<E, A, B, M>(
  ma: Either<E, A>,
  onLeft: (e: E) => Either<M, B>
): Either<M, A | B> {
  return isLeft(ma) ? onLeft(ma.left) : ma
}

/**
 * Alternatively run onLeft returning
 *
 * @ets_data_first orElseEither_
 */
export function orElseEither<E, B, M>(onLeft: (e: E) => Either<M, B>) {
  return <A>(ma: Either<E, A>) => orElseEither_(ma, onLeft)
}

/**
 * Alternatively run onLeft returning
 */
export function orElseEither_<E, A, B, M>(
  ma: Either<E, A>,
  onLeft: (e: E) => Either<M, B>
): Either<M, Either<A, B>> {
  return orElse_(map_(ma, left), (e) => map_(onLeft(e), right))
}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 */
export function parseJSON_<E>(
  s: string,
  onError: (reason: unknown) => E
): Either<E, unknown> {
  return tryCatch(() => JSON.parse(s), onError)
}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @ets_data_first parseJSON_
 */
export function parseJSON<E>(
  onError: (reason: unknown) => E
): (s: string) => Either<E, unknown> {
  return (s) => tryCatch(() => JSON.parse(s), onError)
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 */
export function stringifyJSON_<E>(
  u: unknown,
  onError: (reason: unknown) => E
): Either<E, string> {
  return tryCatch(() => JSON.stringify(u), onError)
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @ets_data_first stringifyJSON_
 */
export function stringifyJSON<E>(
  onError: (reason: unknown) => E
): (u: unknown) => Either<E, string> {
  return (u) => tryCatch(() => JSON.stringify(u), onError)
}

/**
 * Inverts `Either[E, A]` into `Either[A, E]`
 */
export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right)
}

/**
 * Default value for the `onError` argument of `tryCatch`
 */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

/**
 * Constructs a new `Either` from a function that might throw
 */
export function tryCatch<E, A>(f: Lazy<A>, onError: (e: unknown) => E): Either<E, A> {
  try {
    return right(f())
  } catch (e) {
    return left(onError(e))
  }
}

/**
 * Compact types `Either<E, A> | Either<E2, B> = Either<E | E2, A | B>`
 *
 * @ets_optimize identity
 */
export function compact<E extends Either<any, any>>(
  _: E
): [E] extends [Either<infer L, infer R>] ? Either<L, R> : E {
  return _ as any
}

/**
 * Reduce a value `b` through an `Either`
 */
export function reduce_<E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right)
}

/**
 * Reduce a value `b` through an `Either`
 *
 * @ets_data_first reduce_
 */
export function reduce<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: Either<E, A>) => B {
  return (fa) => reduce_(fa, b, f)
}

/**
 * Reduce a value `b` through an `Either` in inverted order
 *
 * @ets_data_first reduceRight_
 */
export function reduceRight<A, B>(b: B, f: (a: A, b: B) => B) {
  return <E>(fa: Either<E, A>): B => reduceRight_(fa, b, f)
}

/**
 * Reduce a value `b` through an `Either` in inverted order
 */
export function reduceRight_<E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b)
}
