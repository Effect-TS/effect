import * as A from "@effect-ts/system/Array"
import type * as E from "@effect-ts/system/Either"

import * as P from "../../Prelude"

/**
 * `Equal[A]` provides implicit evidence that two values of type `A` can be
 * compared for equality.
 */
export interface Equal<A> {
  /**
   * Returns whether two values of type `A` are equal.
   */
  readonly equals: (y: A) => (x: A) => boolean
}

export const EqualURI = "Equal"
export type EqualURI = typeof EqualURI

declare module "../../Prelude/HKT" {
  interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
    [EqualURI]: Equal<A>
  }
}

/**
 * Constructs an `Equal[A]` from a function. The instance will be optimized
 * to first compare the values for reference equality and then compare the
 * values for value equality.
 */
export function makeEqual<A>(f: (y: A) => (x: A) => boolean): Equal<A> {
  return {
    equals: f
  }
}

/**
 * Equality for `Any` values. Note that since values of type `Any` contain
 * no information, all values of type `Any` can be treated as equal to each
 * other.
 */
export const anyEqual: Equal<unknown> = makeEqual(() => () => true)

/**
 * Equality for `Nothing` values. Note that since there are not values of
 * type `Nothing` the `equals` method of this instance can never be called
 * but it can be useful in deriving instances for more complex types.
 */
export const nothingEqual: Equal<never> = makeEqual(() => () => false)

/**
 * Constructs an `Equal[(A, B)]` given an `Equal[A]` and `Equal[B]` by first
 * comparing the `A` values for equality and then comparing the `B` values
 * for equality, if necessary.
 */
export function both<B>(fb: Equal<B>): <A>(fa: Equal<A>) => Equal<readonly [A, B]> {
  return (fa) =>
    makeEqual(([y0, y1]) => ([x0, x1]) => fa.equals(y0)(x0) && fb.equals(y1)(x1))
}

/**
 * The `AssociativeBoth` instance for `Equal`.
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<EqualURI>>({
  both
})

/**
 * Constructs an `Equal[Either[A, B]]` given an `Equal[A]` and an
 * `Equal[B]`. The instance will compare the `Either[A, B]` values and if
 * both are `Right` or `Left` compare them for equality.
 */
export function either<B>(fb: Equal<B>): <A>(fa: Equal<A>) => Equal<E.Either<A, B>> {
  return (fa) =>
    makeEqual((ey) => (ex) =>
      ex._tag === "Left" && ey._tag === "Left"
        ? fa.equals(ey.left)(ex.left)
        : ex._tag === "Right" && ey._tag === "Right"
        ? fb.equals(ey.right)(ex.right)
        : false
    )
}
/**
 * The `AssociativeEither` instance for `Equal`.
 */
export const AssociativeEither = P.instance<P.AssociativeEither<EqualURI>>({
  either
})

/**
 * Constructs an `Equal[B]` given an `Equal[A]` and a function `f` to
 * transform a `B` value into an `A` value. The instance will convert each
 * `B` value into an `A` and the compare the `A` values for equality.
 */
export function contramap<A, B>(f: (a: B) => A): (fa: Equal<A>) => Equal<B> {
  return (fa) => makeEqual((y) => (x) => fa.equals(f(y))(f(x)))
}

/**
 * The `Contravariant` instance for `Equal`.
 */
export const Contravariant = P.instance<P.Contravariant<EqualURI>>({
  contramap
})

/**
 * The `Any` instance for `Equal`.
 */
export const Any = P.instance<P.Any<EqualURI>>({
  any: () => anyEqual
})

/**
 * The `IdentityBoth` instance for `Equal`.
 */
export const IdentityBoth = P.instance<P.IdentityBoth<EqualURI>>({
  ...Any,
  ...AssociativeBoth
})

/**
 * The `None` instance for `Equal`.
 */
export const None = P.instance<P.None<EqualURI>>({
  never: () => nothingEqual
})

/**
 * The `IdentityEither` instance for `Equal`.
 */
export const IdentityEither = P.instance<P.IdentityEither<EqualURI>>({
  ...None,
  ...AssociativeEither
})

/**
 * Constructs an `Equal[A]` that uses the default notion of equality
 * embodied in the implementation of `equals` for values of type `A`.
 */
export function strict<A>() {
  return makeEqual<A>((y) => (x) => x === y)
}

/**
 * Equality for `number` values.
 */
export const number = strict<number>()

/**
 * Equality for `string` values.
 */
export const string = strict<string>()

/**
 * Equality for `symbol` values.
 */
export const symbol = strict<symbol>()

/**
 * Derives an `Equal[Array[A]]` given an `Equal[A]`.
 */
export function eqArray<A>(EqA: Equal<A>): Equal<A.Array<A>> {
  return {
    equals: (y) => (x) => {
      if (x.length === y.length) {
        for (let i = 0; i < x.length; i++) {
          if (!EqA.equals(y[i])(x[i])) {
            return false
          }
        }
        return true
      }
      return false
    }
  }
}
