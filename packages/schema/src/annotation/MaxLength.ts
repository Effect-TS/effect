/**
 * @since 1.0.0
 */

import type { Annotations } from "@fp-ts/codec/Annotation"
import * as A from "@fp-ts/codec/Annotation"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const AnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/annotation/MaxLength"
) as AnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type AnnotationId = typeof AnnotationId

/**
 * @since 1.0.0
 */
export interface MaxLengthAnnotation {
  readonly _id: AnnotationId
  readonly maxLength: number
}

/**
 * @since 1.0.0
 */
export const make = (maxLength: number): MaxLengthAnnotation => ({
  _id: AnnotationId,
  maxLength
})

/**
 * @since 1.0.0
 */
export const is = (u: unknown): u is MaxLengthAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === AnnotationId

/**
 * @since 1.0.0
 */
export const get = (annotations: Annotations): Option<number> =>
  pipe(A.find(annotations, is), O.map((a) => a.maxLength))

/**
 * @since 1.0.0
 */
export const add = (maxLength: number) =>
  (annotations: Annotations): Annotations =>
    annotations.filter((a) => !is(a)).concat([make(maxLength)])
