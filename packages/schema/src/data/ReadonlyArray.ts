/**
 * @since 1.0.0
 */

import { pipe } from "@effect/data/Function"
import * as I from "@effect/schema/internal/common"
import type { AnnotationOptions, Schema } from "@effect/schema/Schema"

/**
 * @category identifiers
 * @since 1.0.0
 */
export const MinItemsId = "@effect/schema/ReadonlyArray/minItems"

/**
 * @since 1.0.0
 */
export const minItems = <A>(
  n: number,
  annotationOptions?: AnnotationOptions<ReadonlyArray<A>>
) =>
  (self: Schema<ReadonlyArray<A>>): Schema<ReadonlyArray<A>> =>
    pipe(
      self,
      I.filter((a): a is ReadonlyArray<A> => a.length >= n, {
        typeId: MinItemsId,
        description: `an array of at least ${n} items`,
        jsonSchema: { minItems: n },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const MaxItemsId = "@effect/schema/ReadonlyArray/maxItems"

/**
 * @since 1.0.0
 */
export const maxItems = <A>(
  n: number,
  annotationOptions?: AnnotationOptions<ReadonlyArray<A>>
) =>
  (self: Schema<ReadonlyArray<A>>): Schema<ReadonlyArray<A>> =>
    pipe(
      self,
      I.filter((a): a is ReadonlyArray<A> => a.length <= n, {
        typeId: MaxItemsId,
        description: `an array of at most ${n} items`,
        jsonSchema: { maxItems: n },
        ...annotationOptions
      })
    )

/**
 * @since 1.0.0
 */
export const ItemsCountId = "@effect/schema/ReadonlyArray/itemsCount"

/**
 * @since 1.0.0
 */
export const itemsCount = <A>(
  n: number,
  annotationOptions?: AnnotationOptions<ReadonlyArray<A>>
) =>
  (self: Schema<ReadonlyArray<A>>): Schema<ReadonlyArray<A>> =>
    pipe(
      self,
      I.filter((a): a is ReadonlyArray<A> => a.length === n, {
        typeId: ItemsCountId,
        description: `an array of exactly ${n} items`,
        jsonSchema: { minItems: n, maxItems: n },
        ...annotationOptions
      })
    )
