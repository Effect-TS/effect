/**
 * @since 1.0.0
 */
import type * as applicative from "@effect/typeclass/Applicative"
import type * as chainable from "@effect/typeclass/Chainable"
import * as covariant from "@effect/typeclass/Covariant"
import type * as flatMap_ from "@effect/typeclass/FlatMap"
import type * as foldable from "@effect/typeclass/Foldable"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monad from "@effect/typeclass/Monad"
import type * as of_ from "@effect/typeclass/Of"
import type * as pointed from "@effect/typeclass/Pointed"
import type * as product_ from "@effect/typeclass/Product"
import type * as semiAlternative from "@effect/typeclass/SemiAlternative"
import type * as semiApplicative from "@effect/typeclass/SemiApplicative"
import type * as semiCoproduct from "@effect/typeclass/SemiCoproduct"
import type { Semigroup } from "@effect/typeclass/Semigroup"
import type * as semiProduct from "@effect/typeclass/SemiProduct"
import type * as traversable from "@effect/typeclass/Traversable"
import { dual, identity } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import * as readonlyArray from "effect/ReadonlyArray"

const of: <A>(a: A) => Identity<A> = identity

const map: {
  <A, B>(f: (a: A) => B): (self: Identity<A>) => Identity<B>
  <A, B>(self: Identity<A>, f: (a: A) => B): Identity<B>
} = dual(2, <A, B>(self: Identity<A>, f: (a: A) => B): Identity<B> => f(self))

const imap = covariant.imap<IdentityTypeLambda>(map)

const flatMap: {
  <A, B>(f: (a: A) => B): (self: Identity<A>) => Identity<B>
  <A, B>(self: Identity<A>, f: (a: A) => B): Identity<B>
} = dual(2, <A, B>(self: Identity<A>, f: (a: A) => B): Identity<B> => f(self))

const product = <A, B>(self: Identity<A>, that: Identity<B>): Identity<[A, B]> => [self, that]

const productMany = <A>(
  self: Identity<A>,
  collection: Iterable<A>
): [A, ...Array<A>] => [self, ...collection]

const traverse = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B>(f: (a: A) => Kind<F, R, O, E, B>): (self: Identity<A>) => Kind<F, R, O, E, B>
  <A, R, O, E, B>(self: Identity<A>, f: (a: A) => Kind<F, R, O, E, B>): Kind<F, R, O, E, B>
} =>
  dual(
    2,
    <A, R, O, E, B>(self: Identity<A>, f: (a: A) => Kind<F, R, O, E, B>): Kind<F, R, O, E, B> =>
      f(self)
  )

/**
 * @category models
 * @since 1.0.0
 */
export type Identity<A> = A

/**
 * @category type lambdas
 * @since 1.0.0
 */
export interface IdentityTypeLambda extends TypeLambda {
  readonly type: Identity<this["Target"]>
}

/**
 * @category type lambdas
 * @since 1.0.0
 */
export interface IdentityTypeLambdaFix<A> extends TypeLambda {
  readonly type: Identity<A>
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Covariant: covariant.Covariant<IdentityTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Invariant: invariant.Invariant<IdentityTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Of: of_.Of<IdentityTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Pointed: pointed.Pointed<IdentityTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 1.0.0
 */
export const FlatMap: flatMap_.FlatMap<IdentityTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Chainable: chainable.Chainable<IdentityTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Monad: monad.Monad<IdentityTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiProduct: semiProduct.SemiProduct<IdentityTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Product: product_.Product<IdentityTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll: readonlyArray.fromIterable
}

/**
 * @category instances
 * @since 1.0.0
 */
export const SemiApplicative: semiApplicative.SemiApplicative<IdentityTypeLambda> = {
  imap,
  map,
  product,
  productMany
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Applicative: applicative.Applicative<IdentityTypeLambda> = {
  imap,
  of,
  map,
  product,
  productMany,
  productAll: readonlyArray.fromIterable
}

/**
 * @category instances
 * @since 1.0.0
 */
export const getSemiCoproduct = <A>(
  S: Semigroup<A>
): semiCoproduct.SemiCoproduct<IdentityTypeLambdaFix<A>> => ({
  imap,
  coproduct: dual(2, S.combine),
  coproductMany: dual(2, S.combineMany)
})

/**
 * @category instances
 * @since 1.0.0
 */
export const getSemiAlternative = <A>(
  S: Semigroup<A>
): semiAlternative.SemiAlternative<IdentityTypeLambdaFix<A>> => ({
  ...getSemiCoproduct(S),
  map
})

/**
 * @category instances
 * @since 1.0.0
 */
export const Foldable: foldable.Foldable<IdentityTypeLambda> = {
  reduce: dual(3, <A, B>(self: Identity<A>, b: B, f: (b: B, a: A) => B): B => f(b, self))
}

/**
 * @category instances
 * @since 1.0.0
 */
export const Traversable: traversable.Traversable<IdentityTypeLambda> = {
  traverse
}
