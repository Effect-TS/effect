/**
 * @since 0.24.40
 */

import * as Micro from "effect/Micro"
import type { Concurrency } from "effect/Types"
import type * as applicative from "../Applicative.js"
import type * as chainable from "../Chainable.js"
import * as covariant from "../Covariant.js"
import type * as flatMap_ from "../FlatMap.js"
import type * as invariant from "../Invariant.js"
import type * as monad from "../Monad.js"
import type * as of_ from "../Of.js"
import type * as pointed from "../Pointed.js"
import type * as product_ from "../Product.js"
import type * as semiApplicative from "../SemiApplicative.js"
import type * as semiProduct from "../SemiProduct.js"

const of = Micro.succeed

const map = Micro.map

const flatMap = Micro.flatMap

const imap = covariant.imap<Micro.MicroTypeLambda>(map)

/**
 * @category instances
 * @since 0.24.40
 */
export type ConcurrencyOptions = {
  readonly concurrency?: Concurrency | undefined
}

const product = (options?: ConcurrencyOptions): product_.Product<Micro.MicroTypeLambda>["product"] => (self, that) =>
  Micro.all([self, that], options)

const productMany =
  (options?: ConcurrencyOptions): product_.Product<Micro.MicroTypeLambda>["productMany"] => (self, collection) =>
    Micro.all([self, ...collection], options)

const productAll =
  (options?: ConcurrencyOptions): product_.Product<Micro.MicroTypeLambda>["productAll"] => (collection) =>
    Micro.all(collection, options)

/**
 * @category instances
 * @since 0.24.40
 */
export const Covariant: covariant.Covariant<Micro.MicroTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Invariant: invariant.Invariant<Micro.MicroTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Of: of_.Of<Micro.MicroTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Pointed: pointed.Pointed<Micro.MicroTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.40
 */
export const FlatMap: flatMap_.FlatMap<Micro.MicroTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Chainable: chainable.Chainable<Micro.MicroTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Monad: monad.Monad<Micro.MicroTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const getSemiProduct = (options?: ConcurrencyOptions): semiProduct.SemiProduct<Micro.MicroTypeLambda> => ({
  imap,
  product: product(options),
  productMany: productMany(options)
})

/**
 * @category instances
 * @since 0.24.40
 */
export const getProduct = (options?: ConcurrencyOptions): product_.Product<Micro.MicroTypeLambda> => ({
  of,
  imap,
  product: product(options),
  productMany: productMany(options),
  productAll: productAll(options)
})

/**
 * @category instances
 * @since 0.24.40
 */
export const getSemiApplicative = (
  options?: ConcurrencyOptions
): semiApplicative.SemiApplicative<Micro.MicroTypeLambda> => ({
  imap,
  map,
  product: product(options),
  productMany: productMany(options)
})

/**
 * @category instances
 * @since 0.24.40
 */
export const getApplicative = (options?: ConcurrencyOptions): applicative.Applicative<Micro.MicroTypeLambda> => ({
  imap,
  of,
  map,
  product: product(options),
  productMany: productMany(options),
  productAll: productAll(options)
})
