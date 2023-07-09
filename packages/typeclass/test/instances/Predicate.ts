/**
 * @since 1.0.0
 */
import * as Predicate from "@effect/data/Predicate"
import * as contravariant from "@effect/typeclass/Contravariant"
import type * as invariant from "@effect/typeclass/Invariant"
import * as of_ from "@effect/typeclass/Of"
import type * as product_ from "@effect/typeclass/Product"
import * as semiProduct from "@effect/typeclass/SemiProduct"

const contramap = Predicate.contramap

const imap = contravariant.imap<Predicate.PredicateTypeLambda>(contramap)

/**
 * @category instances
 * @since 1.0.0
 */
export const Contravariant: contravariant.Contravariant<Predicate.PredicateTypeLambda> = {
  imap,
  contramap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<Predicate.PredicateTypeLambda> = {
  imap
}

const of = <A>(_: A): Predicate.Predicate<A> => Predicate.isUnknown

/**
 * @category instances
 * @since 1.0.0
 */
export const Of: of_.Of<Predicate.PredicateTypeLambda> = {
  of
}

const product = <A, B>(
  self: Predicate.Predicate<A>,
  that: Predicate.Predicate<B>
): Predicate.Predicate<readonly [A, B]> => ([a, b]) => self(a) && that(b)

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
 * @since 1.0.0
 */
export const SemiProduct: semiProduct.SemiProduct<Predicate.PredicateTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Product: product_.Product<Predicate.PredicateTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll
}

/**
 * @category do notation
 * @since 1.0.0
 */
export const Do: () => Predicate.Predicate<{}> = of_.Do(Of)

/**
 * A variant of `bind` that sequentially ignores the scope.
 *
 * @category do notation
 * @since 1.0.0
 */
export const bindDiscard: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    that: Predicate.Predicate<B>
  ): (
    self: Predicate.Predicate<A>
  ) => Predicate.Predicate<{ readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: Predicate.Predicate<A>,
    name: Exclude<N, keyof A>,
    that: Predicate.Predicate<B>
  ): Predicate.Predicate<{ readonly [K in N | keyof A]: K extends keyof A ? A[K] : B }>
} = semiProduct.andThenBind(SemiProduct)
