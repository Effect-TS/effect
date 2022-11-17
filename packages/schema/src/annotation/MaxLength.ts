/**
 * @since 1.0.0
 */

import type { Annotations } from "@fp-ts/codec/Annotation"
import * as A from "@fp-ts/codec/Annotation"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const MaxLengthAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/annotation/MaxLength"
) as MaxLengthAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type MaxLengthAnnotationId = typeof MaxLengthAnnotationId

/**
 * @since 1.0.0
 */
export interface MaxLengthAnnotation {
  readonly _id: MaxLengthAnnotationId
  readonly maxLength: number
}

/**
 * @since 1.0.0
 */
export const makeMaxLengthAnnotation = (maxLength: number): MaxLengthAnnotation => ({
  _id: MaxLengthAnnotationId,
  maxLength
})

/**
 * @since 1.0.0
 */
export const isMaxLengthAnnotation = (
  annotation: A.Annotation
): annotation is MaxLengthAnnotation => annotation._id === MaxLengthAnnotationId

/**
 * @since 1.0.0
 */
export const getMaxLength = (annotations: Annotations): Option<number> =>
  pipe(A.find(annotations, isMaxLengthAnnotation), O.map((a) => a.maxLength))

/**
 * @since 1.0.0
 */
export const addMaxLengthAnnotation = (maxLength: number) =>
  (annotations: Annotations): Annotations =>
    annotations.filter((a) => !isMaxLengthAnnotation(a)).concat([
      makeMaxLengthAnnotation(maxLength)
    ])
