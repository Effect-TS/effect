/* adapted from https://github.com/gcanti/fp-ts */
import type { Lazy, Predicate, Refinement } from "../Function/core"
import { tuple } from "../Function/core"
import type { Option } from "../Option/core"
import { isNone } from "../Option/core"

/**
 * Definitions
 */
export interface Left<E> {
  readonly _tag: "Left"
  readonly left: E
}

export interface Right<A> {
  readonly _tag: "Right"
  readonly right: A
}

export type Either<E, A> = Left<E> | Right<A>

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 */
export function right<A>(a: A): Either<never, A> {
  return { _tag: "Right", right: a }
}

/**
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 */
export function left<E>(e: E): Either<E, never> {
  return { _tag: "Left", left: e }
}

/**
 * Widen left side `Either[E, A] => Either[E | E1, A]`
 */
export function widenE<E1>() {
  return <E, A>(self: Either<E, A>): Either<E | E1, A> => self
}

/**
 * Widen right side `Either[E, A] => Either[E, A | A1]`
 */
export function widenA<A1>() {
  return <E, A>(self: Either<E, A>): Either<E, A | A1> => self
}

/**
 * Alternatively construct that if self is left
 */
export const alt_: <E, E2, A, A2>(
  self: Either<E, A>,
  that: () => Either<E2, A2>
) => Either<E | E2, A | A2> = (fx, fy) => (isLeft(fx) ? fy() : fx)

/**
 * Alternatively construct that if self is left
 */
export const alt: <E, A>(
  that: () => Either<E, A>
) => <E2, A2>(self: Either<E2, A2>) => Either<E | E2, A | A2> = (that) => (fa) =>
  alt_(fa, that)

/**
 * Classic Applicative
 */
export const ap_: <E, A, B, E2>(
  fab: Either<E, (a: A) => B>,
  fa: Either<E2, A>
) => Either<E | E2, B> = (mab, ma) =>
  isLeft(mab) ? mab : isLeft(ma) ? ma : right(mab.right(ma.right))

/**
 * Classic Applicative
 */
export const ap: <E, A>(
  fa: Either<E, A>
) => <E2, B>(fab: Either<E2, (a: A) => B>) => Either<E | E2, B> = (fa) => (fab) =>
  ap_(fab, fa)

/**
 * Apply both and return both
 */
export const zip_: <E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
) => Either<E | E2, readonly [A, B]> = (fa, fb) =>
  chain_(fa, (a) => map_(fb, (b) => tuple(a, b)))

/**
 * Apply both and return both
 */
export const zip: <E, B>(
  fb: Either<E, B>
) => <E2, A>(fa: Either<E2, A>) => Either<E | E2, readonly [A, B]> = (fb) => (fa) =>
  zip_(fa, fb)

/**
 * Apply both and return first
 */
export const zipFirst: <E, B>(
  fb: Either<E, B>
) => <E2, A>(fa: Either<E2, A>) => Either<E | E2, A> = (fb) => (fa) => zipFirst_(fa, fb)

/**
 * Apply both and return first
 */
export const zipFirst_: <E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
) => Either<E | E2, A> = (fa, fb) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

/**
 * Apply both and return second
 */
export const zipSecond = <E, B>(fb: Either<E, B>) => <E2, A>(
  fa: Either<E2, A>
): Either<E | E2, B> => zipSecond_(fa, fb)

/**
 * Apply both and return second
 */
export const zipSecond_ = <E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
): Either<E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

/**
 * Maps both left and right
 */
export const bimap_: <E, A, G, B>(
  fea: Either<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => Either<G, B> = (fea, f, g) =>
  isLeft(fea) ? left(f(fea.left)) : right(g(fea.right))

/**
 * Maps both left and right
 */
export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: Either<E, A>) => Either<G, B> = (f, g) => (fa) => bimap_(fa, f, g)

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain_: <E, A, B, E2>(
  fa: Either<E, A>,
  f: (a: A) => Either<E2, B>
) => Either<E | E2, B> = (ma, f) => (isLeft(ma) ? ma : f(ma.right))

/**
 * Extends this computation with another computation that depends on the
 * result of this computation by running the first computation, using its
 * result to generate a second computation, and running that computation.
 */
export const chain: <E, A, B>(
  f: (a: A) => Either<E, B>
) => <E2>(ma: Either<E2, A>) => Either<E | E2, B> = (f) => (ma) => chain_(ma, f)

/**
 * Like chain but ignores the constructed outout
 */
export const tap = <E, A, B>(f: (a: A) => Either<E, B>) => <E2>(
  ma: Either<E2, A>
): Either<E | E2, A> => chain_(ma, (a) => map_(f(a), () => a))

/**
 * Like chain but ignores the constructed outout
 */
export const tap_ = <E2, E, A, B>(
  ma: Either<E2, A>,
  f: (a: A) => Either<E, B>
): Either<E | E2, A> => chain_(ma, (a) => map_(f(a), () => a))

/**
 * Self embed `Either[E, A]` into `Either[E, Either[E, A]]`
 */
export const duplicate: <E, A>(ma: Either<E, A>) => Either<E, Either<E, A>> = (ma) =>
  extend_(ma, (x) => x)

/**
 * Returns `false` if `Left` or returns the result of the application of the given predicate to the `Right` value.
 *
 * @example
 * const gt2 = exists((n: number) => n > 2)
 *
 * assert.strictEqual(gt2(left('a')), false)
 * assert.strictEqual(gt2(right(1)), false)
 * assert.strictEqual(gt2(right(3)), true)
 */
export function exists<A>(predicate: Predicate<A>): <E>(ma: Either<E, A>) => boolean {
  return (ma) => (isLeft(ma) ? false : predicate(ma.right))
}

/**
 * Returns `false` if `Left` or returns the result of the application of the given predicate to the `Right` value.
 *
 * @example
 * const gt2 = exists((n: number) => n > 2)
 *
 * assert.strictEqual(gt2(left('a')), false)
 * assert.strictEqual(gt2(right(1)), false)
 * assert.strictEqual(gt2(right(3)), true)
 */
export function exists_<E, A>(ma: Either<E, A>, predicate: Predicate<A>): boolean {
  return isLeft(ma) ? false : predicate(ma.right)
}

/**
 * Apply `Either[E, A] => B` in case self is right returning `Either[E, B]`
 */
export const extend_: <E, A, B>(
  wa: Either<E, A>,
  f: (wa: Either<E, A>) => B
) => Either<E, B> = (wa, f) => (isLeft(wa) ? wa : right(f(wa)))

/**
 * Apply `Either[E, A] => B` in case self is right returning `Either[E, B]`
 */
export const extend: <E, A, B>(
  f: (fa: Either<E, A>) => B
) => (ma: Either<E, A>) => Either<E, B> = (f) => (ma) => extend_(ma, f)

/**
 * Apply predicate to A and construct E in case the predicate is false
 */
export const filterOrElse: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): <E2>(
    ma: Either<E2, A>
  ) => Either<E | E2, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): <E2>(
    ma: Either<E2, A>
  ) => Either<E | E2, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (
  ma: Either<E, A>
): Either<E, A> => chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))))

/**
 * Apply predicate to A and construct E in case the predicate is false
 */
export const filterOrElse_: {
  <E, E2, A, B extends A>(
    ma: Either<E2, A>,
    refinement: Refinement<A, B>,
    onFalse: (a: A) => E
  ): Either<E | E2, B>
  <E, E2, A>(ma: Either<E2, A>, predicate: Predicate<A>, onFalse: (a: A) => E): Either<
    E | E2,
    A
  >
} = <E, A>(
  ma: Either<E, A>,
  predicate: Predicate<A>,
  onFalse: (a: A) => E
): Either<E, A> => chain_(ma, (a) => (predicate(a) ? right(a) : left(onFalse(a))))

/**
 * Flatten nested `Either[E, Either[E1, A]]` into `Either[E | E1, A]`
 */
export const flatten: <E, E2, A>(mma: Either<E, Either<E2, A>>) => Either<E | E2, A> = (
  mma
) => chain_(mma, (x) => x)

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @example
 * function onLeft(errors: Array<string>): string {
 *   return `Errors: ${errors.join(', ')}`
 * }
 *
 * function onRight(value: number): string {
 *   return `Ok: ${value}`
 * }
 *
 * assert.strictEqual(
 *   pipe(
 *     right(1),
 *     fold(onLeft, onRight)
 *   ),
 *   'Ok: 1'
 * )
 * assert.strictEqual(
 *   pipe(
 *     left(['error 1', 'error 2']),
 *     fold(onLeft, onRight)
 *   ),
 *   'Errors: error 1, error 2'
 * )
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
 *
 * @example
 * function onLeft(errors: Array<string>): string {
 *   return `Errors: ${errors.join(', ')}`
 * }
 *
 * function onRight(value: number): string {
 *   return `Ok: ${value}`
 * }
 *
 * assert.strictEqual(
 *   pipe(
 *     right(1),
 *     fold(onLeft, onRight)
 *   ),
 *   'Ok: 1'
 * )
 * assert.strictEqual(
 *   pipe(
 *     left(['error 1', 'error 2']),
 *     fold(onLeft, onRight)
 *   ),
 *   'Errors: error 1, error 2'
 * )
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
 * @example
 * const parse = fromNullable('nully')
 *
 * assert.deepStrictEqual(parse(1), right(1))
 * assert.deepStrictEqual(parse(null), left('nully'))
 */
export function fromNullable<E>(e: Lazy<E>): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A) => (a == null ? left(e()) : right(a as NonNullable<A>))
}

/**
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`
 *
 * @example
 * const parse = fromNullable('nully')
 *
 * assert.deepStrictEqual(parse(1), right(1))
 * assert.deepStrictEqual(parse(null), left('nully'))
 */
export function fromNullable_<A, E>(a: A, e: Lazy<E>): Either<E, NonNullable<A>> {
  return a == null ? left(e()) : right(a as NonNullable<A>)
}

/**
 * Construct `Either[E, A]` from `Option[A]` constructing `E` with `onNone`
 */
export const fromOption: <E>(onNone: () => E) => <A>(ma: Option<A>) => Either<E, A> = (
  onNone
) => (ma) => (isNone(ma) ? left(onNone()) : right(ma.value))

/**
 * Construct `Either[E, A]` from `Option[A]` constructing `E` with `onNone`
 */
export const fromOption_: <A, E>(ma: Option<A>, onNone: () => E) => Either<E, A> = (
  ma,
  onNone
) => (isNone(ma) ? left(onNone()) : right(ma.value))

/**
 * Construct `Either[E, A]` by applying a predicate to `A` and constructing
 * `E` if the predicate is false
 */
export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Either<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (a: A): Either<E, A> =>
  predicate(a) ? right(a) : left(onFalse(a))

/**
 * Construct `Either[E, A]` by applying a predicate to `A` and constructing
 * `E` if the predicate is false
 */
export const fromPredicate_: {
  <E, A, B extends A>(a: A, refinement: Refinement<A, B>, onFalse: (a: A) => E): Either<
    E,
    B
  >
  <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>
} = <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> =>
  predicate(a) ? right(a) : left(onFalse(a))

/**
 * Get `A` or in case self is left return `onLeft` result
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
export const map_: <E, A, B>(fa: Either<E, A>, f: (a: A) => B) => Either<E, B> = (
  ma,
  f
) => (isLeft(ma) ? ma : right(f(ma.right)))

/**
 * Use `A => B` to transform `Either[E, A]` to `Either[E, B]`
 */
export const map: <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>) => Either<E, B> = (
  f
) => (fa) => map_(fa, f)

/**
 * Use `E => E1` to transform `Either[E, A]` to `Either[E1, A]`
 */
export const mapLeft_: <E, A, G>(fea: Either<E, A>, f: (e: E) => G) => Either<G, A> = (
  fea,
  f
) => (isLeft(fea) ? left(f(fea.left)) : fea)

/**
 * Use `E => E1` to transform `Either[E, A]` to `Either[E1, A]`
 */
export const mapLeft: <E, G>(
  f: (e: E) => G
) => <A>(fa: Either<E, A>) => Either<G, A> = (f) => (fa) => mapLeft_(fa, f)

/**
 * Merges Left<E> | Right<B> into A | B
 */
export const merge = <E, A>(self: Either<E, A>): E | A =>
  fold_(
    self,
    (x) => x,
    (x) => x
  )

/**
 * Alternatively run onLeft
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
 *
 * @example
 * assert.deepStrictEqual(parseJSON('{"a":1}', toError), right({ a: 1 }))
 * assert.deepStrictEqual(parseJSON('{"a":}', toError), left(new SyntaxError('Unexpected token } in JSON at position 5')))
 */
export function parseJSON_<E>(
  s: string,
  onError: (reason: unknown) => E
): Either<E, unknown> {
  return tryCatch_(() => JSON.parse(s), onError)
}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @example
 * assert.deepStrictEqual(parseJSON('{"a":1}', toError), right({ a: 1 }))
 * assert.deepStrictEqual(parseJSON('{"a":}', toError), left(new SyntaxError('Unexpected token } in JSON at position 5')))
 */
export function parseJSON<E>(
  onError: (reason: unknown) => E
): (s: string) => Either<E, unknown> {
  return (s) => tryCatch_(() => JSON.parse(s), onError)
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @example
 * assert.deepStrictEqual(E.stringifyJSON({ a: 1 }, E.toError), E.right('{"a":1}'))
 * const circular: any = { ref: null }
 * circular.ref = circular
 * assert.deepStrictEqual(
 *   pipe(
 *     E.stringifyJSON(circular, E.toError),
 *     E.mapLeft(e => e.message.includes('Converting circular structure to JSON'))
 *   ),
 *   E.left(true)
 * )
 */
export function stringifyJSON<E>(
  u: unknown,
  onError: (reason: unknown) => E
): Either<E, string> {
  return tryCatch_(() => JSON.stringify(u), onError)
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
 *
 * @example
 * const unsafeHead = <A>(as: Array<A>): A => {
 *   if (as.length > 0) {
 *     return as[0]
 *   } else {
 *     throw new Error('empty array')
 *   }
 * }
 *
 * const head = <A>(as: Array<A>): Either<Error, A> => {
 *   return tryCatch(() => unsafeHead(as), e => (e instanceof Error ? e : new Error('unknown error')))
 * }
 *
 * assert.deepStrictEqual(head([]), left(new Error('empty array')))
 * assert.deepStrictEqual(head([1, 2, 3]), right(1))
 */
export function tryCatch_<E, A>(f: Lazy<A>, onError: (e: unknown) => E): Either<E, A> {
  try {
    return right(f())
  } catch (e) {
    return left(onError(e))
  }
}

/**
 * Constructs a new `Either` from a function that might throw
 *
 * @example
 * const unsafeHead = <A>(as: Array<A>): A => {
 *   if (as.length > 0) {
 *     return as[0]
 *   } else {
 *     throw new Error('empty array')
 *   }
 * }
 *
 * const head = <A>(as: Array<A>): Either<Error, A> => {
 *   return tryCatch(() => unsafeHead(as), e => (e instanceof Error ? e : new Error('unknown error')))
 * }
 *
 * assert.deepStrictEqual(head([]), left(new Error('empty array')))
 * assert.deepStrictEqual(head([1, 2, 3]), right(1))
 */
export function tryCatch<E>(
  onError: (e: unknown) => E
): <A>(f: Lazy<A>) => Either<E, A> {
  return (f) => {
    try {
      return right(f())
    } catch (e) {
      return left(onError(e))
    }
  }
}

/**
 * Compact types Either<E, A> | Either<E2, B> = Either<E | E2, A | B>
 */
export function compact<E extends Either<any, any>>(
  _: E
): [E] extends [Either<infer L, infer R>] ? Either<L, R> : E {
  return _ as any
}
