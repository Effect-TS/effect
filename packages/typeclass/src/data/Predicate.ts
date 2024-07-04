/**
 * @since 0.24.0
 */
import { constFalse, constTrue } from "effect/Function"
import * as Predicate from "effect/Predicate"
import * as contravariant from "../Contravariant.js"
import type * as invariant from "../Invariant.js"
import * as monoid from "../Monoid.js"
import type * as of_ from "../Of.js"
import type * as product_ from "../Product.js"
import * as semigroup from "../Semigroup.js"
import type { Semigroup } from "../Semigroup.js"
import type * as semiProduct from "../SemiProduct.js"

const contramap = Predicate.mapInput

const imap = contravariant.imap<Predicate.PredicateTypeLambda>(contramap)

const of = <A>(_: A): Predicate.Predicate<A> => Predicate.isUnknown

const product = <A, B>(
  self: Predicate.Predicate<A>,
  that: Predicate.Predicate<B>
): Predicate.Predicate<readonly [A, B]> =>
([a, b]) => self(a) && that(b)

const productAll = <A>(
  collection: Iterable<Predicate.Predicate<A>>
): Predicate.Predicate<ReadonlyArray<A>> => {
  return (as) => {
    let collectionIndex = 0
    for (const p of collection) {
      if (collectionIndex >= as.length) {
        break
      }
      if (p(as[collectionIndex]) === false) {
        return false
      }
      collectionIndex++
    }
    return true
  }
}

const productMany = <A>(
  self: Predicate.Predicate<A>,
  collection: Iterable<Predicate.Predicate<A>>
): Predicate.Predicate<readonly [A, ...Array<A>]> => {
  const rest = productAll(collection)
  return ([head, ...tail]) => self(head) === false ? false : rest(tail)
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Contravariant: contravariant.Contravariant<Predicate.PredicateTypeLambda> = {
  imap,
  contramap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Invariant: invariant.Invariant<Predicate.PredicateTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Of: of_.Of<Predicate.PredicateTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiProduct: semiProduct.SemiProduct<Predicate.PredicateTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Product: product_.Product<Predicate.PredicateTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll
}

/**
 * @category instances
 * @since 0.24.0
 */
export const getSemigroupEqv = <A>(): Semigroup<Predicate.Predicate<A>> =>
  semigroup.make<Predicate.Predicate<A>>(Predicate.eqv)

/**
 * @category instances
 * @since 0.24.0
 */
export const getMonoidEqv = <A>(): monoid.Monoid<Predicate.Predicate<A>> =>
  monoid.fromSemigroup(getSemigroupEqv<A>(), constTrue)

/**
 * @category instances
 * @since 0.24.0
 */
export const getSemigroupXor = <A>(): Semigroup<Predicate.Predicate<A>> =>
  semigroup.make<Predicate.Predicate<A>>(Predicate.xor)

/**
 * @category instances
 * @since 0.24.0
 */
export const getMonoidXor = <A>(): monoid.Monoid<Predicate.Predicate<A>> =>
  monoid.fromSemigroup(getSemigroupXor<A>(), constFalse)

/**
 * @category instances
 * @since 0.24.0
 */
export const getSemigroupSome = <A>(): Semigroup<Predicate.Predicate<A>> =>
  semigroup.make<Predicate.Predicate<A>>(
    Predicate.or,
    (self, collection) => (a) => {
      if (self(a)) {
        return true
      }
      for (const p of collection) {
        if (p(a)) {
          return true
        }
      }
      return false
    }
  )

/**
 * @category instances
 * @since 0.24.0
 */
export const getMonoidSome = <A>(): monoid.Monoid<Predicate.Predicate<A>> =>
  monoid.fromSemigroup(getSemigroupSome<A>(), constFalse)

/**
 * @category instances
 * @since 0.24.0
 */
export const getSemigroupEvery = <A>(): Semigroup<Predicate.Predicate<A>> =>
  semigroup.make<Predicate.Predicate<A>>(
    Predicate.and,
    (self, collection) => (a) => {
      if (!self(a)) {
        return false
      }
      for (const p of collection) {
        if (!p(a)) {
          return false
        }
      }
      return true
    }
  )

/**
 * @category instances
 * @since 0.24.0
 */
export const getMonoidEvery = <A>(): monoid.Monoid<Predicate.Predicate<A>> =>
  monoid.fromSemigroup(getSemigroupEvery<A>(), constTrue)
