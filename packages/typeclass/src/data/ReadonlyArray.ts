/**
 * This module provides utility functions for working with arrays in TypeScript.
 *
 * @since 1.0.0
 */

import type { Either } from "effect/Either"
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { Option } from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as applicative from "../Applicative.js"
import type * as chainable from "../Chainable.js"
import * as covariant from "../Covariant.js"
import type * as filterable from "../Filterable.js"
import type * as flatMap_ from "../FlatMap.js"
import type * as foldable from "../Foldable.js"
import type * as invariant from "../Invariant.js"
import type * as monad from "../Monad.js"
import type { Monoid } from "../Monoid.js"
import * as monoid from "../Monoid.js"
import type * as of_ from "../Of.js"
import type * as pointed from "../Pointed.js"
import type * as product_ from "../Product.js"
import type * as semiApplicative from "../SemiApplicative.js"
import type { Semigroup } from "../Semigroup.js"
import * as semigroup from "../Semigroup.js"
import * as semiProduct from "../SemiProduct.js"
import type * as traversable from "../Traversable.js"
import type * as traversableFilterable from "../TraversableFilterable.js"

const of = ReadonlyArray.of

const map = ReadonlyArray.map

const imap = covariant.imap<ReadonlyArray.ReadonlyArrayTypeLambda>(map)

const flatMap = ReadonlyArray.flatMap

const product = <A, B>(self: ReadonlyArray<A>, that: ReadonlyArray<B>): ReadonlyArray<[A, B]> => {
  if (ReadonlyArray.isEmptyReadonlyArray(self) || ReadonlyArray.isEmptyReadonlyArray(that)) {
    return ReadonlyArray.empty()
  }
  const out: Array<[A, B]> = []
  for (let i = 0; i < self.length; i++) {
    for (let j = 0; j < that.length; j++) {
      out.push([self[i], that[j]])
    }
  }
  return out
}

const productMany = semiProduct.productMany<ReadonlyArray.ReadonlyArrayTypeLambda>(map, product)

const traverse = <F extends TypeLambda>(F: applicative.Applicative<F>): {
  <A, R, O, E, B>(
    f: (a: A, i: number) => Kind<F, R, O, E, B>
  ): (self: Iterable<A>) => Kind<F, R, O, E, Array<B>>
  <A, R, O, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Array<B>>
} =>
  dual(2, <A, R, O, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Array<B>> => F.productAll(ReadonlyArray.fromIterable(self).map(f)))

const traversePartitionMap = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B, C>(
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): (self: ReadonlyArray<A>) => Kind<F, R, O, E, [Array<B>, Array<C>]>
  <A, R, O, E, B, C>(
    self: ReadonlyArray<A>,
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): Kind<F, R, O, E, [Array<B>, Array<C>]>
} =>
  dual(2, <A, R, O, E, B, C>(
    self: ReadonlyArray<A>,
    f: (a: A) => Kind<F, R, O, E, Either<C, B>>
  ): Kind<F, R, O, E, [Array<B>, Array<C>]> => {
    return F.map(traverse(F)(self, f), ReadonlyArray.separate)
  })

const traverseFilterMap = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): (self: ReadonlyArray<A>) => Kind<F, R, O, E, Array<B>>
  <A, R, O, E, B>(
    self: ReadonlyArray<A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Array<B>>
} =>
  dual(2, <A, R, O, E, B>(
    self: ReadonlyArray<A>,
    f: (a: A) => Kind<F, R, O, E, Option<B>>
  ): Kind<F, R, O, E, Array<B>> => {
    return F.map(traverse(F)(self, f), ReadonlyArray.getSomes)
  })

/**
 * @category instances
 * @since 1.0.0
 */
export const Of: of_.Of<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant: covariant.Covariant<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Pointed: pointed.Pointed<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const FlatMap: flatMap_.FlatMap<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Chainable: chainable.Chainable<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Filterable: filterable.Filterable<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  partitionMap: ReadonlyArray.partitionMap,
  filterMap: ReadonlyArray.filterMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable: traversable.Traversable<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  traverse: traverse as any
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiProduct: semiProduct.SemiProduct<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiApplicative: semiApplicative.SemiApplicative<
  ReadonlyArray.ReadonlyArrayTypeLambda
> = {
  imap,
  map,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Product: product_.Product<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll: (collection) => {
    const arrays = ReadonlyArray.fromIterable(collection)
    return ReadonlyArray.isEmptyReadonlyArray(arrays) ?
      ReadonlyArray.empty() :
      SemiProduct.productMany(arrays[0], arrays.slice(1))
  }
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Applicative: applicative.Applicative<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap,
  of,
  map,
  product,
  productMany,
  productAll: Product.productAll
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Monad: monad.Monad<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Foldable: foldable.Foldable<ReadonlyArray.ReadonlyArrayTypeLambda> = {
  reduce: ReadonlyArray.reduce
}

/**
 * @category instances
 * @since 1.0.0
 */
export const TraversableFilterable: traversableFilterable.TraversableFilterable<
  ReadonlyArray.ReadonlyArrayTypeLambda
> = {
  traversePartitionMap: traversePartitionMap as any,
  traverseFilterMap: traverseFilterMap as any
}

/**
 * @category instances
 * @since 1.0.0
 */
export const getSemigroup: <A>() => Semigroup<ReadonlyArray<A>> = semigroup.array

/**
 * @category instances
 * @since 1.0.0
 */
export const getMonoid: <A>() => Monoid<ReadonlyArray<A>> = monoid.array
