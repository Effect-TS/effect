/* adapted from https://github.com/gcanti/fp-ts */

import { Traversable2 } from "fp-ts/lib/Traversable"

import * as AP from "../Apply"
import type {
  HKT,
  Separated,
  CSequence2,
  CApplicative,
  CTraverse2,
  CWitherable2C,
  CMonad2C,
  CAlt2C,
  CChainRec2C,
  CFoldable2,
  CTraversable2,
  CBifunctor2,
  CExtend2,
  Traverse2,
  CWilt2C,
  CWither2C,
  Wither2C,
  Wilt2C,
  CApplicative2C,
  Monad2,
  Foldable2,
  Bifunctor2,
  Extend2,
  ChainRec2,
  MonadThrow2,
  Applicative2,
  Alt2,
  Monad2C,
  Alt2C,
  ChainRec2C,
  Applicative,
  Witherable2C
} from "../Base"
import { tailRec } from "../Base/ChainRec"
import { Do as DoG } from "../Do"
import type { Eq } from "../Eq"
import { Lazy, Predicate, Refinement, flow } from "../Function"
import type { Monoid } from "../Monoid"
import { isNone, Option } from "../Option"
import type { Semigroup } from "../Semigroup"
import type { Show } from "../Show"
import type { Effect, Managed, Stream, StreamEither } from "../Support/Common"

import type {
  ChainRec2M,
  Monad2M,
  MonadThrow2M,
  CAlt2M,
  Applicative2M
} from "./overloads"

export interface Left<E> {
  readonly _tag: "Left"
  readonly left: E
}

export interface Right<A> {
  readonly _tag: "Right"
  readonly right: A
}

export type Either<E, A> = Left<E> | Right<A>

export const alt_: <E, E2, A, A2>(
  fx: Either<E, A>,
  fy: () => Either<E2, A2>
) => Either<E | E2, A | A2> = (fx, fy) => (isLeft(fx) ? fy() : fx)

export const alt: <E, A>(
  that: () => Either<E, A>
) => <E2, A2>(fa: Either<E2, A2>) => Either<E | E2, A | A2> = (that) => (fa) =>
  alt_(fa, that)

export const ap_: <E, A, B, E2>(
  fab: Either<E, (a: A) => B>,
  fa: Either<E2, A>
) => Either<E | E2, B> = (mab, ma) =>
  isLeft(mab) ? mab : isLeft(ma) ? ma : right(mab.right(ma.right))

export const ap: <E, A>(
  fa: Either<E, A>
) => <E2, B>(fab: Either<E2, (a: A) => B>) => Either<E | E2, B> = (fa) => (fab) =>
  ap_(fab, fa)

export const apFirst: <E, B>(
  fb: Either<E, B>
) => <E2, A>(fa: Either<E2, A>) => Either<E | E2, A> = (fb) => (fa) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apFirst_: <E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
) => Either<E | E2, A> = (fa, fb) =>
  ap_(
    map_(fa, (a) => () => a),
    fb
  )

export const apSecond = <E, B>(fb: Either<E, B>) => <E2, A>(
  fa: Either<E2, A>
): Either<E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const apSecond_ = <E2, A, E, B>(
  fa: Either<E2, A>,
  fb: Either<E, B>
): Either<E | E2, B> =>
  ap_(
    map_(fa, () => (b: B) => b),
    fb
  )

export const bimap_: <E, A, G, B>(
  fea: Either<E, A>,
  f: (e: E) => G,
  g: (a: A) => B
) => Either<G, B> = (fea, f, g) =>
  isLeft(fea) ? left(f(fea.left)) : right(g(fea.right))

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => (fa: Either<E, A>) => Either<G, B> = (f, g) => (fa) => bimap_(fa, f, g)

export const chain_: <E, A, B, E2>(
  fa: Either<E, A>,
  f: (a: A) => Either<E2, B>
) => Either<E | E2, B> = (ma, f) => (isLeft(ma) ? ma : f(ma.right))

export const chain: <E, A, B>(
  f: (a: A) => Either<E, B>
) => <E2>(ma: Either<E2, A>) => Either<E | E2, B> = (f) => (ma) => chain_(ma, f)

export const chainTap = <E, A, B>(f: (a: A) => Either<E, B>) => <E2>(
  ma: Either<E2, A>
): Either<E | E2, A> => chain_(ma, (a) => map_(f(a), () => a))

export const chainTap_ = <E2, E, A, B>(
  ma: Either<E2, A>,
  f: (a: A) => Either<E, B>
): Either<E | E2, A> => chain_(ma, (a) => map_(f(a), () => a))

export const chainRec: <E, A, B>(
  a: A,
  f: (a: A) => Either<E, Either<A, B>>
) => Either<E, B> = (a, f) =>
  tailRec(f(a), (e) =>
    isLeft(e)
      ? rightW(leftW(e.left))
      : isLeft(e.right)
      ? leftW(f(e.right.left))
      : rightW(rightW(e.right.right))
  )

export const duplicate: <E, A>(ma: Either<E, A>) => Either<E, Either<E, A>> = (ma) =>
  extend_(ma, (x) => x)

export function elem<A>(E: Eq<A>): (a: A) => <E>(ma: Either<E, A>) => boolean {
  return (a) => (ma) => (isLeft(ma) ? false : E.equals(a, ma.right))
}

export function elem_<A>(E: Eq<A>): <E>(ma: Either<E, A>, a: A) => boolean {
  return (ma, a) => (isLeft(ma) ? false : E.equals(a, ma.right))
}

/**
 * Returns `false` if `Left` or returns the result of the application of the given predicate to the `Right` value.
 *
 * @example
 * import { exists, left, right } from '@matechs/core/Either'
 *
 * const gt2 = exists((n: number) => n > 2)
 *
 * assert.strictEqual(gt2(left('a')), false)
 * assert.strictEqual(gt2(right(1)), false)
 * assert.strictEqual(gt2(right(3)), true)
 */
export function exists<A>(predicate: Predicate<A>): <E>(ma: Either<E, A>) => boolean {
  return (ma) => (isLeft(ma) ? false : predicate(ma.right))
}

export function exists_<E, A>(ma: Either<E, A>, predicate: Predicate<A>): boolean {
  return isLeft(ma) ? false : predicate(ma.right)
}

export const extend_: <E, A, B, E2>(
  wa: Either<E, A>,
  f: (wa: Either<E2, A>) => B
) => Either<E | E2, B> = (wa, f) => (isLeft(wa) ? wa : right(f(wa)))

export const extend: <E, A, B>(
  f: (fa: Either<E, A>) => B
) => <E2>(ma: Either<E2, A>) => Either<E | E2, B> = (f) => (ma) => extend_(ma, f)

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

export const flatten: <E, E2, A>(mma: Either<E, Either<E2, A>>) => Either<E | E2, A> = (
  mma
) => chain_(mma, (x) => x)

/**
 * Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the first function,
 * if the value is a `Right` the inner value is applied to the second function.
 *
 * @example
 * import { fold, left, right } from '@matechs/core/Either'
 * import { pipe } from '@matechs/core/Function'
 *
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
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => StreamEither<S1, R1, E1, B>,
  onRight: (a: A) => StreamEither<S2, R2, E2, C>
): (ma: Either<E, A>) => StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Stream<S1, R1, E1, B>,
  onRight: (a: A) => Stream<S2, R2, E2, C>
): (ma: Either<E, A>) => Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Managed<S1, R1, E1, B>,
  onRight: (a: A) => Managed<S2, R2, E2, C>
): (ma: Either<E, A>) => Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  onLeft: (e: E) => Effect<S1 | S2, R1, E1, B>,
  onRight: (a: A) => Effect<S1 | S2, R2, E2, C>
): (ma: Either<E, A>) => Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold<E, A, B, C>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): (ma: Either<E, A>) => B | C
export function fold<E, A, B>(
  onLeft: (e: E) => B,
  onRight: (a: A) => B
): (ma: Either<E, A>) => B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : onRight(ma.right))
}

export function fold_<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  ma: Either<E, A>,
  onLeft: (e: E) => StreamEither<S1, R1, E1, B>,
  onRight: (a: A) => StreamEither<S2, R2, E2, C>
): StreamEither<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  ma: Either<E, A>,
  onLeft: (e: E) => Stream<S1, R1, E1, B>,
  onRight: (a: A) => Stream<S2, R2, E2, C>
): Stream<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  ma: Either<E, A>,
  onLeft: (e: E) => Managed<S1, R1, E1, B>,
  onRight: (a: A) => Managed<S2, R2, E2, C>
): Managed<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<S1, S2, E, A, B, C, R1, E1, R2, E2>(
  ma: Either<E, A>,
  onLeft: (e: E) => Effect<S1 | S2, R1, E1, B>,
  onRight: (a: A) => Effect<S1 | S2, R2, E2, C>
): Effect<S1 | S2, R1 & R2, E1 | E2, B | C>
export function fold_<E, A, B, C>(
  ma: Either<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C
): B | C
export function fold_<E, A, B>(
  ma: Either<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => B
): B {
  return isLeft(ma) ? onLeft(ma.left) : onRight(ma.right)
}

export const foldMap_: <M>(
  M: Monoid<M>
) => <E, A>(fa: Either<E, A>, f: (a: A) => M) => M = (M) => (fa, f) =>
  isLeft(fa) ? M.empty : f(fa.right)

export const foldMap: <M>(
  M: Monoid<M>
) => <A>(f: (a: A) => M) => <E>(fa: Either<E, A>) => M = (M) => (f) => (fa) =>
  foldMap_(M)(fa, f)

/**
 * Takes a default and a nullable value, if the value is not nully, turn it into a `Right`, if the value is nully use
 * the provided default as a `Left`
 *
 * @example
 * import { fromNullable, left, right } from '@matechs/core/Either'
 *
 * const parse = fromNullable('nully')
 *
 * assert.deepStrictEqual(parse(1), right(1))
 * assert.deepStrictEqual(parse(null), left('nully'))
 */
export function fromNullable<E>(e: Lazy<E>): <A>(a: A) => Either<E, NonNullable<A>> {
  return <A>(a: A) => (a == null ? left(e()) : right(a as NonNullable<A>))
}
export function fromNullable_<A, E>(a: A, e: Lazy<E>): Either<E, NonNullable<A>> {
  return a == null ? left(e()) : right(a as NonNullable<A>)
}

export const fromOption: <E>(onNone: () => E) => <A>(ma: Option<A>) => Either<E, A> = (
  onNone
) => (ma) => (isNone(ma) ? left(onNone()) : right(ma.value))

export const fromOption_: <A, E>(ma: Option<A>, onNone: () => E) => Either<E, A> = (
  ma,
  onNone
) => (isNone(ma) ? left(onNone()) : right(ma.value))

export const fromPredicate: {
  <E, A, B extends A>(refinement: Refinement<A, B>, onFalse: (a: A) => E): (
    a: A
  ) => Either<E, B>
  <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E): (a: A) => Either<E, A>
} = <E, A>(predicate: Predicate<A>, onFalse: (a: A) => E) => (a: A): Either<E, A> =>
  predicate(a) ? right(a) : left(onFalse(a))

export const fromPredicate_: {
  <E, A, B extends A>(a: A, refinement: Refinement<A, B>, onFalse: (a: A) => E): Either<
    E,
    B
  >
  <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A>
} = <E, A>(a: A, predicate: Predicate<A>, onFalse: (a: A) => E): Either<E, A> =>
  predicate(a) ? right(a) : left(onFalse(a))

export function getApplyMonoid<E, A>(M: Monoid<A>): Monoid<Either<E, A>> {
  return {
    ...getApplySemigroup(M),
    empty: right(M.empty)
  }
}

/**
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are appended using the provided `Semigroup`
 *
 * @example
 * import { getApplySemigroup, left, right } from '@matechs/core/Either'
 * import { semigroupSum } from '@matechs/core/Semigroup'
 *
 * const S = getApplySemigroup<string, number>(semigroupSum)
 * assert.deepStrictEqual(S.concat(left('a'), left('b')), left('a'))
 * assert.deepStrictEqual(S.concat(left('a'), right(2)), left('a'))
 * assert.deepStrictEqual(S.concat(right(1), left('b')), left('b'))
 * assert.deepStrictEqual(S.concat(right(1), right(2)), right(3))
 */
export function getApplySemigroup<E, A>(S: Semigroup<A>): Semigroup<Either<E, A>> {
  return {
    concat: (x, y) =>
      isLeft(x) ? x : isLeft(y) ? y : right(S.concat(x.right, y.right))
  }
}

export function getEq<E, A>(EL: Eq<E>, EA: Eq<A>): Eq<Either<E, A>> {
  return {
    equals: (x, y) =>
      x === y ||
      (isLeft(x)
        ? isLeft(y) && EL.equals(x.left, y.left)
        : isRight(y) && EA.equals(x.right, y.right))
  }
}

export function getOrElse<E, A>(onLeft: (e: E) => A): <B>(ma: Either<E, B>) => A | B {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma.right)
}

/**
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * appended using the provided `Semigroup`
 *
 * @example
 * import { getSemigroup, left, right } from '@matechs/core/Either'
 * import { semigroupSum } from '@matechs/core/Semigroup'
 *
 * const S = getSemigroup<string, number>(semigroupSum)
 * assert.deepStrictEqual(S.concat(left('a'), left('b')), left('a'))
 * assert.deepStrictEqual(S.concat(left('a'), right(2)), right(2))
 * assert.deepStrictEqual(S.concat(right(1), left('b')), right(1))
 * assert.deepStrictEqual(S.concat(right(1), right(2)), right(3))
 */
export function getSemigroup<E, A>(S: Semigroup<A>): Semigroup<Either<E, A>> {
  return {
    concat: (x, y) =>
      isLeft(y) ? x : isLeft(x) ? y : right(S.concat(x.right, y.right))
  }
}

export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<Either<E, A>> {
  return {
    show: (ma) =>
      isLeft(ma) ? `left(${SE.show(ma.left)})` : `right(${SA.show(ma.right)})`
  }
}

export function getValidationMonoid<E, A>(
  SE: Semigroup<E>,
  SA: Monoid<A>
): Monoid<Either<E, A>> {
  return {
    concat: getValidationSemigroup(SE, SA).concat,
    empty: right(SA.empty)
  }
}

export function getValidationSemigroup<E, A>(
  SE: Semigroup<E>,
  SA: Semigroup<A>
): Semigroup<Either<E, A>> {
  return {
    concat: (fx, fy) =>
      isLeft(fx)
        ? isLeft(fy)
          ? left(SE.concat(fx.left, fy.left))
          : fx
        : isLeft(fy)
        ? fy
        : right(SA.concat(fx.right, fy.right))
  }
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
 * Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
 * structure
 */
export function left<E = never>(e: E): Either<E, never> {
  return { _tag: "Left", left: e }
}

export function leftW<E = never, A = never>(e: E): Either<E, A> {
  return { _tag: "Left", left: e }
}

export const map_: <E, A, B>(fa: Either<E, A>, f: (a: A) => B) => Either<E, B> = (
  ma,
  f
) => (isLeft(ma) ? ma : right(f(ma.right)))

export const map: <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>) => Either<E, B> = (
  f
) => (fa) => map_(fa, f)

export const mapLeft_: <E, A, G>(fea: Either<E, A>, f: (e: E) => G) => Either<G, A> = (
  fea,
  f
) => (isLeft(fea) ? left(f(fea.left)) : fea)

export const mapLeft: <E, G>(
  f: (e: E) => G
) => <A>(fa: Either<E, A>) => Either<G, A> = (f) => (fa) => mapLeft_(fa, f)

export function orElse<E, A, M>(
  onLeft: (e: E) => Either<M, A>
): (ma: Either<E, A>) => Either<M, A> {
  return (ma) => (isLeft(ma) ? onLeft(ma.left) : ma)
}

export function orElse_<E, A, M>(
  ma: Either<E, A>,
  onLeft: (e: E) => Either<M, A>
): Either<M, A> {
  return isLeft(ma) ? onLeft(ma.left) : ma
}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * @example
 * import { parseJSON, toError, right, left } from '@matechs/core/Either'
 *
 * assert.deepStrictEqual(parseJSON('{"a":1}', toError), right({ a: 1 }))
 * assert.deepStrictEqual(parseJSON('{"a":}', toError), left(new SyntaxError('Unexpected token } in JSON at position 5')))
 */
export function parseJSON_<E>(
  s: string,
  onError: (reason: unknown) => E
): Either<E, unknown> {
  return tryCatch_(() => JSON.parse(s), onError)
}

export function parseJSON<E>(
  onError: (reason: unknown) => E
): (s: string) => Either<E, unknown> {
  return (s) => tryCatch_(() => JSON.parse(s), onError)
}

export const reduce_: <E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B) => B = (
  fa,
  b,
  f
) => (isLeft(fa) ? b : f(b, fa.right))

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => <E>(fa: Either<E, A>) => B = (b, f) => (fa) => reduce_(fa, b, f)

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => <E>(fa: Either<E, A>) => B = (b, f) => (fa) => reduceRight_(fa, b, f)

export const reduceRight_: <E, A, B>(
  fa: Either<E, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => (isLeft(fa) ? b : f(fa.right, b))

/**
 * Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
 * of this structure
 */
export function right<A = never>(a: A): Either<never, A> {
  return { _tag: "Right", right: a }
}

export function rightW<E = never, A = never>(a: A): Either<E, A> {
  return { _tag: "Right", right: a }
}

export const sequence: CSequence2<URI> = <F>(F: CApplicative<F>) => <E, A>(
  ma: Either<E, HKT<F, A>>
): HKT<F, Either<E, A>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<A, Either<E, A>>(right)(ma.right)
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 *
 * @example
 * import * as E from '@matechs/core/Either'
 * import { pipe } from '@matechs/core/Function'
 *
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

export function swap<E, A>(ma: Either<E, A>): Either<A, E> {
  return isLeft(ma) ? right(ma.left) : left(ma.right)
}

/**
 * Default value for the `onError` argument of `tryCatch`
 */
export function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e))
}

export const traverse: CTraverse2<URI> = <F>(F: CApplicative<F>) => <A, B>(
  f: (a: A) => HKT<F, B>
): (<TE>(ma: Either<TE, A>) => HKT<F, Either<TE, B>>) => {
  return <TE>(ma: Either<TE, A>) =>
    isLeft(ma) ? F.of(left(ma.left)) : F.map<B, Either<TE, B>>(right)(f(ma.right))
}

export const traverse_: Traverse2<URI> = <F>(F: CApplicative<F>) => <A, B, TE>(
  ma: Either<TE, A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Either<TE, B>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<B, Either<TE, B>>(right)(f(ma.right))
}

/**
 * Constructs a new `Either` from a function that might throw
 *
 * @example
 * import { Either, left, right, tryCatch } from '@matechs/core/Either'
 *
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

export function compact<E>(M: Monoid<E>) {
  return <A>(ma: Either<E, Option<A>>): Either<E, A> => {
    return isLeft(ma)
      ? ma
      : ma.right._tag === "None"
      ? left(M.empty)
      : right(ma.right.value)
  }
}

export function separate<E>(M: Monoid<E>) {
  const empty = left(M.empty)

  return <A, B>(ma: Either<E, Either<A, B>>): Separated<Either<E, A>, Either<E, B>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : isLeft(ma.right)
      ? { left: right(ma.right.left), right: empty }
      : { left: empty, right: right(ma.right.right) }
  }
}

export function partitionMap<E>(M: Monoid<E>) {
  const empty = left(M.empty)

  return <A, B, C>(
    f: (a: A) => Either<B, C>
  ): ((ma: Either<E, A>) => Separated<Either<E, B>, Either<E, C>>) => {
    return (ma) => {
      if (isLeft(ma)) {
        return { left: ma, right: ma }
      }
      const e = f(ma.right)
      return isLeft(e)
        ? { left: right(e.left), right: empty }
        : { left: empty, right: right(e.right) }
    }
  }
}

export function partitionMap_<E>(M: Monoid<E>) {
  const empty = left(M.empty)

  return <A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => Either<B, C>
  ): Separated<Either<E, B>, Either<E, C>> => {
    if (isLeft(ma)) {
      return { left: ma, right: ma }
    }
    const e = f(ma.right)
    return isLeft(e)
      ? { left: right(e.left), right: empty }
      : { left: empty, right: right(e.right) }
  }
}

export function partition<E>(M: Monoid<E>) {
  const empty = left(M.empty)

  return <A>(
    p: Predicate<A>
  ): ((ma: Either<E, A>) => Separated<Either<E, A>, Either<E, A>>) => {
    return (ma) =>
      isLeft(ma)
        ? { left: ma, right: ma }
        : p(ma.right)
        ? { left: empty, right: right(ma.right) }
        : { left: right(ma.right), right: empty }
  }
}

export function partition_<E>(M: Monoid<E>) {
  const empty = left(M.empty)

  return <A>(
    ma: Either<E, A>,
    p: Predicate<A>
  ): Separated<Either<E, A>, Either<E, A>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : p(ma.right)
      ? { left: empty, right: right(ma.right) }
      : { left: right(ma.right), right: empty }
  }
}

export function filterMap<E>(M: Monoid<E>) {
  return <A, B>(f: (a: A) => Option<B>): ((ma: Either<E, A>) => Either<E, B>) => {
    return (ma) => {
      if (isLeft(ma)) {
        return ma
      }
      const ob = f(ma.right)
      return ob._tag === "None" ? left(M.empty) : right(ob.value)
    }
  }
}

export function filterMap_<E>(M: Monoid<E>) {
  return <A, B>(ma: Either<E, A>, f: (a: A) => Option<B>): Either<E, B> => {
    if (isLeft(ma)) {
      return ma
    }
    const ob = f(ma.right)
    return ob._tag === "None" ? left(M.empty) : right(ob.value)
  }
}

export function filter<E>(M: Monoid<E>) {
  return <A>(predicate: Predicate<A>): ((ma: Either<E, A>) => Either<E, A>) => (ma) =>
    isLeft(ma) ? ma : predicate(ma.right) ? ma : left(M.empty)
}

export function filter_<E>(M: Monoid<E>) {
  return <A>(ma: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
    isLeft(ma) ? ma : predicate(ma.right) ? ma : left(M.empty)
}

export function wither<E>(M: Monoid<E>): CWither2C<URI, E> {
  const com = compact(M)
  return <F>(
    F: CApplicative<F>
  ): (<A, B>(
    f: (a: A) => HKT<F, Option<B>>
  ) => (ma: Either<E, A>) => HKT<F, Either<E, B>>) => {
    const traverseF = traverse(F)
    return (f) => flow(traverseF(f), F.map(com))
  }
}

export function wither_<E>(M: Monoid<E>): Wither2C<URI, E> {
  const com = compact(M)
  return <F>(
    F: CApplicative<F>
  ): (<A, B>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Either<E, B>>) => {
    const traverseF = traverse_(F)
    return (ma, f) => F.map(com)(traverseF(ma, f))
  }
}

export function wilt<E>(M: Monoid<E>): CWilt2C<URI, E> {
  const sep = separate(M)
  return <F>(
    F: CApplicative<F>
  ): (<A, B, C>(
    f: (a: A) => HKT<F, Either<B, C>>
  ) => (ma: Either<E, A>) => HKT<F, Separated<Either<E, B>, Either<E, C>>>) => {
    const traverseF = traverse(F)
    return (f) => flow(traverseF(f), F.map(sep))
  }
}

export function wilt_<E>(M: Monoid<E>): Wilt2C<URI, E> {
  const sep = separate(M)
  return <F>(
    F: CApplicative<F>
  ): (<A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Either<E, B>, Either<E, C>>>) => {
    const traverseF = traverse_(F)
    return (ma, f) => F.map(sep)(traverseF(ma, f))
  }
}

export function getWitherable<E>(M: Monoid<E>): CWitherable2C<URI, E> {
  return {
    URI,
    _E: undefined as any,
    map,
    compact: compact(M),
    separate: separate(M),
    filter: filter(M),
    filterMap: filterMap(M),
    partition: partition(M),
    partitionMap: partitionMap(M),
    traverse,
    sequence,
    reduce,
    foldMap,
    reduceRight,
    wither: wither(M),
    wilt: wilt(M)
  }
}

export const URI = "@matechs/core/Either"
export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    [URI]: Either<E, A>
  }
}

export const eitherMonad: Monad2M<URI> & ChainRec2M<URI> & Applicative2M<URI> = {
  URI,
  map,
  of: right,
  ap,
  chain,
  chainRec
}

export const eitherAp: Applicative2M<URI> = {
  URI,
  map,
  of: right,
  ap
}

export function getValidation<E>(
  S: Semigroup<E>
): CMonad2C<URI, E> & CAlt2C<URI, E> & CChainRec2C<URI, E> & CApplicative2C<URI, E> {
  return {
    ...eitherMonad,
    _E: undefined as any,
    ap: (ma) => (mab) =>
      isLeft(mab)
        ? isLeft(ma)
          ? left(S.concat(mab.left, ma.left))
          : mab
        : isLeft(ma)
        ? ma
        : right(mab.right(ma.right)),
    alt: (f) => (fx) => {
      if (isRight(fx)) {
        return fx
      }
      const fy = f()
      return isLeft(fy) ? left(S.concat(fx.left, fy.left)) : fy
    }
  }
}

export const either: Monad2M<URI> &
  CFoldable2<URI> &
  CTraversable2<URI> &
  CBifunctor2<URI> &
  CAlt2M<URI> &
  CExtend2<URI> &
  ChainRec2M<URI> &
  MonadThrow2M<URI> &
  Applicative2M<URI> = {
  URI,
  map,
  of: right,
  ap,
  chain,
  reduce,
  foldMap,
  reduceRight,
  traverse,
  sequence,
  bimap,
  mapLeft,
  alt,
  extend,
  chainRec,
  throwError: left
}

export const Do = () => DoG(eitherMonad)

export const sequenceS =
  /*#__PURE__*/
  (() => AP.sequenceS(eitherAp))()

export const sequenceT =
  /*#__PURE__*/
  (() => AP.sequenceT(eitherAp))()

//
// Compatibility with fp-ts ecosystem
//

const traverse__ = <F>(F: Applicative<F>) => <A, B, TE>(
  ma: Either<TE, A>,
  f: (a: A) => HKT<F, B>
): HKT<F, Either<TE, B>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<B, Either<TE, B>>(f(ma.right), right)
}

const sequence_ = <F>(F: Applicative<F>) => <E, A>(
  ma: Either<E, HKT<F, A>>
): HKT<F, Either<E, A>> => {
  return isLeft(ma) ? F.of(left(ma.left)) : F.map<A, Either<E, A>>(ma.right, right)
}

export const either_: Monad2<URI> &
  Foldable2<URI> &
  Traversable2<URI> &
  Bifunctor2<URI> &
  Alt2<URI> &
  Extend2<URI> &
  ChainRec2<URI> &
  MonadThrow2<URI> &
  Applicative2<URI> = {
  URI,
  map: map_,
  of: right,
  ap: ap_,
  chain: chain_,
  reduce: reduce_,
  foldMap: foldMap_,
  reduceRight: reduceRight_,
  traverse: traverse__,
  sequence: sequence_,
  bimap: bimap_,
  mapLeft: mapLeft_,
  alt: alt_,
  extend: extend_,
  chainRec,
  throwError: left
}

export const eitherMonad_: Monad2<URI> & ChainRec2<URI> = {
  URI,
  map: map_,
  of: right,
  ap: ap_,
  chain: chain_,
  chainRec
}

export function getValidation_<E>(
  S: Semigroup<E>
): Monad2C<URI, E> & Alt2C<URI, E> & ChainRec2C<URI, E> {
  return {
    ...eitherMonad_,
    _E: undefined as any,
    ap: (mab, ma) =>
      isLeft(mab)
        ? isLeft(ma)
          ? left(S.concat(mab.left, ma.left))
          : mab
        : isLeft(ma)
        ? ma
        : right(mab.right(ma.right)),
    alt: (fx, f) => {
      if (isRight(fx)) {
        return fx
      }
      const fy = f()
      return isLeft(fy) ? left(S.concat(fx.left, fy.left)) : fy
    }
  }
}

export function getWitherable_<E>(M: Monoid<E>): Witherable2C<URI, E> {
  const empty = left(M.empty)

  const compact = <A>(ma: Either<E, Option<A>>): Either<E, A> => {
    return isLeft(ma)
      ? ma
      : ma.right._tag === "None"
      ? left(M.empty)
      : right(ma.right.value)
  }

  const separate = <A, B>(
    ma: Either<E, Either<A, B>>
  ): Separated<Either<E, A>, Either<E, B>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : isLeft(ma.right)
      ? { left: right(ma.right.left), right: empty }
      : { left: empty, right: right(ma.right.right) }
  }

  const partitionMap = <A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => Either<B, C>
  ): Separated<Either<E, B>, Either<E, C>> => {
    if (isLeft(ma)) {
      return { left: ma, right: ma }
    }
    const e = f(ma.right)
    return isLeft(e)
      ? { left: right(e.left), right: empty }
      : { left: empty, right: right(e.right) }
  }

  const partition = <A>(
    ma: Either<E, A>,
    p: Predicate<A>
  ): Separated<Either<E, A>, Either<E, A>> => {
    return isLeft(ma)
      ? { left: ma, right: ma }
      : p(ma.right)
      ? { left: empty, right: right(ma.right) }
      : { left: right(ma.right), right: empty }
  }

  const filterMap = <A, B>(ma: Either<E, A>, f: (a: A) => Option<B>): Either<E, B> => {
    if (isLeft(ma)) {
      return ma
    }
    const ob = f(ma.right)
    return ob._tag === "None" ? left(M.empty) : right(ob.value)
  }

  const filter = <A>(ma: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
    isLeft(ma) ? ma : predicate(ma.right) ? ma : left(M.empty)

  const wither = <F>(
    F: Applicative<F>
  ): (<A, B>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Option<B>>
  ) => HKT<F, Either<E, B>>) => {
    const traverseF = traverse__(F)
    return (ma, f) => F.map(traverseF(ma, f), compact)
  }

  const wilt = <F>(
    F: Applicative<F>
  ): (<A, B, C>(
    ma: Either<E, A>,
    f: (a: A) => HKT<F, Either<B, C>>
  ) => HKT<F, Separated<Either<E, B>, Either<E, C>>>) => {
    const traverseF = traverse__(F)
    return (ma, f) => F.map(traverseF(ma, f), separate)
  }

  return {
    URI,
    _E: undefined as any,
    map: map_,
    compact,
    separate,
    filter,
    filterMap,
    partition,
    partitionMap,
    traverse: traverse__,
    sequence: sequence_,
    reduce: reduce_,
    foldMap: foldMap_,
    reduceRight: reduceRight_,
    wither,
    wilt
  }
}
