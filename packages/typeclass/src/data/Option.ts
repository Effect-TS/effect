/**
 * @category instances
 * @since 1.0.0
 */
import type * as alternative from "@effect/typeclass/Alternative"
import type * as applicative from "@effect/typeclass/Applicative"
import type * as chainable from "@effect/typeclass/Chainable"
import type * as coproduct_ from "@effect/typeclass/Coproduct"
import * as covariant from "@effect/typeclass/Covariant"
import type * as filterable from "@effect/typeclass/Filterable"
import type * as flatMap_ from "@effect/typeclass/FlatMap"
import type * as foldable from "@effect/typeclass/Foldable"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monad from "@effect/typeclass/Monad"
import type { Monoid } from "@effect/typeclass/Monoid"
import * as monoid from "@effect/typeclass/Monoid"
import type * as of_ from "@effect/typeclass/Of"
import type * as pointed from "@effect/typeclass/Pointed"
import type * as product_ from "@effect/typeclass/Product"
import type * as semiAlternative from "@effect/typeclass/SemiAlternative"
import type * as semiApplicative from "@effect/typeclass/SemiApplicative"
import type * as semiCoproduct from "@effect/typeclass/SemiCoproduct"
import type { Semigroup } from "@effect/typeclass/Semigroup"
import * as semigroup from "@effect/typeclass/Semigroup"
import type * as semiProduct from "@effect/typeclass/SemiProduct"
import type * as traversable from "@effect/typeclass/Traversable"
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import * as Option from "effect/Option"

const of = Option.some

const map = Option.map

const flatMap = Option.flatMap

const productAll = Option.all

const coproductAll = Option.firstSomeOf

const zero = Option.none

const product = Option.product

const productMany = Option.productMany

const imap = covariant.imap<Option.OptionTypeLambda>(map)

const coproduct = <A, B>(self: Option.Option<A>, that: Option.Option<B>): Option.Option<A | B> =>
  Option.isSome(self) ? self : that

const coproductMany = <A>(
  self: Option.Option<A>,
  collection: Iterable<Option.Option<A>>
): Option.Option<A> => Option.isSome(self) ? self : Option.firstSomeOf(collection)

const traverse = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<F, R, O, E, B>
  ): (self: Option.Option<A>) => Kind<F, R, O, E, Option.Option<B>>
  <A, R, O, E, B>(
    self: Option.Option<A>,
    f: (a: A) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Option.Option<B>>
} =>
  dual(
    2,
    <A, R, O, E, B>(
      self: Option.Option<A>,
      f: (a: A) => Kind<F, R, O, E, B>
    ): Kind<F, R, O, E, Option.Option<B>> =>
      Option.isNone(self) ? F.of(Option.none()) : F.map(f(self.value), Option.some)
  )

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant: covariant.Covariant<Option.OptionTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<Option.OptionTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Of: of_.Of<Option.OptionTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Pointed: pointed.Pointed<Option.OptionTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const FlatMap: flatMap_.FlatMap<Option.OptionTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Chainable: chainable.Chainable<Option.OptionTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Monad: monad.Monad<Option.OptionTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiProduct: semiProduct.SemiProduct<Option.OptionTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Product: product_.Product<Option.OptionTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiApplicative: semiApplicative.SemiApplicative<Option.OptionTypeLambda> = {
  imap,
  map,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Applicative: applicative.Applicative<Option.OptionTypeLambda> = {
  imap,
  of,
  map,
  product,
  productMany,
  productAll
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiCoproduct: semiCoproduct.SemiCoproduct<Option.OptionTypeLambda> = {
  imap,
  coproduct,
  coproductMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Coproduct: coproduct_.Coproduct<Option.OptionTypeLambda> = {
  imap,
  coproduct,
  coproductMany,
  zero,
  coproductAll
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiAlternative: semiAlternative.SemiAlternative<Option.OptionTypeLambda> = {
  map,
  imap,
  coproduct,
  coproductMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Alternative: alternative.Alternative<Option.OptionTypeLambda> = {
  map,
  imap,
  coproduct,
  coproductMany,
  coproductAll,
  zero
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Foldable: foldable.Foldable<Option.OptionTypeLambda> = {
  reduce: dual(
    3,
    <A, B>(self: Option.Option<A>, b: B, f: (b: B, a: A) => B): B =>
      Option.isNone(self) ? b : f(b, self.value)
  )
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Filterable: filterable.Filterable<Option.OptionTypeLambda> = {
  partitionMap: Option.partitionMap,
  filterMap: Option.filterMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable: traversable.Traversable<Option.OptionTypeLambda> = {
  traverse
}

/**
 * @category instances
 * @since 1.0.0
 */
export const getOptionalMonoid = <A>(
  Semigroup: Semigroup<A>
): Monoid<Option.Option<A>> =>
  monoid.fromSemigroup(
    semigroup.make((self, that) =>
      Option.isNone(self) ?
        that :
        Option.isNone(that) ?
        self :
        Option.some(Semigroup.combine(self.value, that.value))
    ),
    Option.none()
  )
