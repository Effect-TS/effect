/**
 * @since 0.24.0
 */

import type { Kind, TypeLambda } from "effect/HKT"
import type { Of } from "./Of.js"
import type { SemiProduct } from "./SemiProduct.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Product<F extends TypeLambda> extends SemiProduct<F>, Of<F> {
  readonly productAll: <R, O, E, A>(
    collection: Iterable<Kind<F, R, O, E, A>>
  ) => Kind<F, R, O, E, Array<A>>
}

/**
 * @since 0.24.0
 */
export const tuple =
  <F extends TypeLambda>(F: Product<F>) =>
  <T extends ReadonlyArray<Kind<F, any, any, any, any>>>(...elements: T): Kind<
    F,
    ([T[number]] extends [Kind<F, infer R, any, any, any>] ? R
      : never),
    (T[number] extends never ? never
      : [T[number]] extends [Kind<F, any, infer O, any, any>] ? O
      : never),
    (T[number] extends never ? never
      : [T[number]] extends [Kind<F, any, any, infer E, any>] ? E
      : never),
    {
      [I in keyof T]: [T[I]] extends [Kind<F, any, any, any, infer A>] ? A
        : never
    }
  > => F.productAll(elements) as any

/**
 * @since 0.24.0
 */
export const struct =
  <F extends TypeLambda>(F: Product<F>) =>
  <R extends { readonly [x: string]: Kind<F, any, any, any, any> }>(fields: R): Kind<
    F,
    ([R[keyof R]] extends [Kind<F, infer R, any, any, any>] ? R
      : never),
    (R[keyof R] extends never ? never
      : [R[keyof R]] extends [Kind<F, any, infer O, any, any>] ? O
      : never),
    (R[keyof R] extends never ? never
      : [R[keyof R]] extends [Kind<F, any, any, infer E, any>] ? E
      : never),
    {
      [K in keyof R]: [R[K]] extends [Kind<F, any, any, any, infer A>] ? A
        : never
    }
  > => {
    const keys = Object.keys(fields)
    return F.imap(F.productAll(keys.map((k) => fields[k])), (values) => {
      const out: any = {}
      for (let i = 0; i < values.length; i++) {
        out[keys[i]] = values[i]
      }
      return out
    }, (r) => keys.map((k) => r[k]))
  }
