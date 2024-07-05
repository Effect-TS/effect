/**
 * @since 0.24.40
 */

import * as Effect from "effect/Effect"
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

const of = Effect.succeed

const map = Effect.map

const flatMap = Effect.flatMap

const imap = covariant.imap<Effect.EffectTypeLambda>(map)

/**
 * @category instances
 * @since 0.24.40
 */
export type ConcurrencyOptions = {
  readonly concurrency?: Concurrency | undefined
  readonly batching?: boolean | "inherit" | undefined
}

const product = (options?: ConcurrencyOptions): product_.Product<Effect.EffectTypeLambda>["product"] => (self, that) =>
  Effect.all([self, that], options)

const productMany =
  (options?: ConcurrencyOptions): product_.Product<Effect.EffectTypeLambda>["productMany"] => (self, collection) =>
    Effect.all([self, ...collection], options)

const productAll =
  (options?: ConcurrencyOptions): product_.Product<Effect.EffectTypeLambda>["productAll"] => (collection) =>
    Effect.all(collection, options)

/**
 * @category instances
 * @since 0.24.40
 */
export const Covariant: covariant.Covariant<Effect.EffectTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Invariant: invariant.Invariant<Effect.EffectTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Of: of_.Of<Effect.EffectTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Pointed: pointed.Pointed<Effect.EffectTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.40
 */
export const FlatMap: flatMap_.FlatMap<Effect.EffectTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Chainable: chainable.Chainable<Effect.EffectTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const Monad: monad.Monad<Effect.EffectTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.40
 */
export const getSemiProduct = (options?: ConcurrencyOptions): semiProduct.SemiProduct<Effect.EffectTypeLambda> => ({
  imap,
  product: product(options),
  productMany: productMany(options)
})

/**
 * @category instances
 * @since 0.24.40
 */
export const getProduct = (options?: ConcurrencyOptions): product_.Product<Effect.EffectTypeLambda> => ({
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
): semiApplicative.SemiApplicative<Effect.EffectTypeLambda> => ({
  imap,
  map,
  product: product(options),
  productMany: productMany(options)
})

/**
 * @category instances
 * @since 0.24.40
 */
export const getApplicative = (options?: ConcurrencyOptions): applicative.Applicative<Effect.EffectTypeLambda> => ({
  imap,
  of,
  map,
  product: product(options),
  productMany: productMany(options),
  productAll: productAll(options)
})
