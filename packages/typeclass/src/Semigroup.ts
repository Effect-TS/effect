/**
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import type { TypeLambda } from "effect/HKT"
import type { Order } from "effect/Order"
import { map, reduce } from "./internal/Iterable.js"
import type * as invariant from "./Invariant.js"
import * as product_ from "./Product.js"
import type * as semiProduct from "./SemiProduct.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Semigroup<A> {
  readonly combine: (self: A, that: A) => A
  readonly combineMany: (self: A, collection: Iterable<A>) => A
}

/**
 * @category type lambdas
 * @since 0.24.0
 */
export interface SemigroupTypeLambda extends TypeLambda {
  readonly type: Semigroup<this["Target"]>
}

/**
 * The `combineMany` parameter is optional and defaults to a standard
 * implementation. You can provide a custom implementation when performance
 * optimizations are possible.
 *
 * @category constructors
 * @since 0.24.0
 */
export const make = <A>(
  combine: Semigroup<A>["combine"],
  combineMany: Semigroup<A>["combineMany"] = (self, collection) => reduce(self, combine)(collection)
): Semigroup<A> => ({
  combine,
  combineMany
})

/**
 * `Semigroup` that returns last minimum of elements.
 *
 * @category constructors
 * @since 0.24.0
 */
export const min = <A>(O: Order<A>): Semigroup<A> => make((self, that) => O(self, that) === -1 ? self : that)

/**
 * `Semigroup` that returns last maximum of elements.
 *
 * @category constructors
 * @since 0.24.0
 */
export const max = <A>(O: Order<A>): Semigroup<A> => make((self, that) => O(self, that) === 1 ? self : that)

/**
 * @category constructors
 * @since 0.24.0
 */
export const constant = <A>(a: A): Semigroup<A> => make(() => a, () => a)

/**
 * The dual of a `Semigroup`, obtained by flipping the arguments of `combine`.
 *
 * @since 0.24.0
 */
export const reverse = <A>(S: Semigroup<A>): Semigroup<A> =>
  make(
    (self, that) => S.combine(that, self),
    (self, collection) => {
      const reversed = Array.from(collection).reverse()
      return reversed.length > 0 ?
        S.combine(S.combineMany(reversed[0], reversed.slice(1)), self) :
        self
    }
  )

/**
 * The `intercalate` API returns a function that takes a `Semigroup` instance and a separator value, and returns a new
 * `Semigroup` instance that combines values with the given separator.
 *
 * This API is useful when you want to combine values with a specific separator. For example, when you want to concatenate
 * an array of strings with a separator string in between.
 *
 * It is interesting to note that there is no equivalent API in the `Monoid` module. This is because the value `empty`,
 * which is required for the `Monoid` interface, cannot exist.
 *
 * @since 0.24.0
 */
export const intercalate: {
  <A>(separator: A): (S: Semigroup<A>) => Semigroup<A>
  <A>(S: Semigroup<A>, separator: A): Semigroup<A>
} = dual(
  2,
  <A>(S: Semigroup<A>, separator: A): Semigroup<A> => make((self, that) => S.combineMany(self, [separator, that]))
)

/**
 * Always return the first argument.
 *
 * @category instances
 * @since 0.24.0
 */
export const first = <A = never>(): Semigroup<A> => make((a) => a, (a) => a)

/**
 * Always return the last argument.
 *
 * @category instances
 * @since 0.24.0
 */
export const last = <A = never>(): Semigroup<A> =>
  make(
    (_, second) => second,
    (self, collection) => {
      let a: A = self
      // eslint-disable-next-line no-empty
      for (a of collection) {}
      return a
    }
  )

/**
 * @since 0.24.0
 */
export const imap: {
  <A, B>(to: (a: A) => B, from: (b: B) => A): (self: Semigroup<A>) => Semigroup<B>
  <A, B>(self: Semigroup<A>, to: (a: A) => B, from: (b: B) => A): Semigroup<B>
} = dual(3, <A, B>(S: Semigroup<A>, to: (a: A) => B, from: (b: B) => A): Semigroup<B> =>
  make(
    (self, that) => to(S.combine(from(self), from(that))),
    (self, collection) => to(S.combineMany(from(self), map(from)(collection)))
  ))

/**
 * @category instances
 * @since 0.24.0
 */
export const Invariant: invariant.Invariant<SemigroupTypeLambda> = {
  imap
}

const product = <A, B>(self: Semigroup<A>, that: Semigroup<B>): Semigroup<[A, B]> =>
  make(([xa, xb], [ya, yb]) => [self.combine(xa, ya), that.combine(xb, yb)])

const productAll = <A>(collection: Iterable<Semigroup<A>>): Semigroup<Array<A>> => {
  return make((x, y) => {
    const len = Math.min(x.length, y.length)
    const out: Array<A> = []
    let collectionLength = 0
    for (const s of collection) {
      if (collectionLength >= len) {
        break
      }
      out.push(s.combine(x[collectionLength], y[collectionLength]))
      collectionLength++
    }
    return out
  })
}

const productMany = <A>(
  self: Semigroup<A>,
  collection: Iterable<Semigroup<A>>
): Semigroup<[A, ...Array<A>]> => {
  const semigroup = productAll(collection)
  return make((x, y) => [self.combine(x[0], y[0]), ...semigroup.combine(x.slice(1), y.slice(1))])
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiProduct: semiProduct.SemiProduct<SemigroupTypeLambda> = {
  imap,
  product,
  productMany
}

const of: <A>(a: A) => Semigroup<A> = constant

/**
 * @category instances
 * @since 0.24.0
 */
export const Product: product_.Product<SemigroupTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll
}

/**
 * Similar to `Promise.all` but operates on `Semigroup`s.
 *
 * ```
 * [Semigroup<A>, Semigroup<B>, ...] -> Semigroup<[A, B, ...]>
 * ```
 *
 * This function creates and returns a new `Semigroup` for a tuple of values based on the given `Semigroup`s for each element in the tuple.
 * The returned `Semigroup` combines two tuples of the same type by applying the corresponding `Semigroup` passed as arguments to each element in the tuple.
 *
 * It is useful when you need to combine two tuples of the same type and you have a specific way of combining each element of the tuple.
 *
 * @category combinators
 * @since 0.24.0
 */
export const tuple: <T extends ReadonlyArray<Semigroup<any>>>(
  ...elements: T
) => Semigroup<{ readonly [I in keyof T]: [T[I]] extends [Semigroup<infer A>] ? A : never }> = product_.tuple(Product)

/**
 * Given a type `A`, this function creates and returns a `Semigroup` for `ReadonlyArray<A>`.
 * The returned `Semigroup` combines two arrays by concatenating them.
 *
 * @category combinators
 * @since 0.24.0
 */
export const array = <A>(): Semigroup<ReadonlyArray<A>> => make((self, that) => self.concat(that))

/**
 * This function creates and returns a new `Semigroup` for a struct of values based on the given `Semigroup`s for each property in the struct.
 * The returned `Semigroup` combines two structs of the same type by applying the corresponding `Semigroup` passed as arguments to each property in the struct.
 *
 * It is useful when you need to combine two structs of the same type and you have a specific way of combining each property of the struct.
 *
 * @category combinators
 * @since 0.24.0
 */
export const struct: <R extends { readonly [x: string]: Semigroup<any> }>(
  fields: R
) => Semigroup<{ readonly [K in keyof R]: [R[K]] extends [Semigroup<infer A>] ? A : never }> = product_.struct(Product)
