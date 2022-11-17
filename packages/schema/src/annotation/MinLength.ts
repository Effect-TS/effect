/**
 * @since 1.0.0
 */

import type { Annotations } from "@fp-ts/codec/Annotation"
import * as A from "@fp-ts/codec/Annotation"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const MinLengthAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/annotation/MinLength"
) as MinLengthAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type MinLengthAnnotationId = typeof MinLengthAnnotationId

/**
 * @since 1.0.0
 */
export interface MinLengthAnnotation {
  readonly _id: MinLengthAnnotationId
  readonly minLength: number
}

/**
 * @since 1.0.0
 */
export const makeMinLengthAnnotation = (minLength: number): MinLengthAnnotation => ({
  _id: MinLengthAnnotationId,
  minLength
})

/**
 * @since 1.0.0
 */
export const isMinLengthAnnotation = (
  annotation: A.Annotation
): annotation is MinLengthAnnotation => annotation._id === MinLengthAnnotationId

/**
 * @since 1.0.0
 */
export const getMinLength = (annotations: Annotations): Option<number> =>
  pipe(A.find(annotations, isMinLengthAnnotation), O.map((a) => a.minLength))

/**
 * @since 1.0.0
 */
export const addMinLengthAnnotation = (minLength: number) =>
  (annotations: Annotations): Annotations =>
    annotations.filter((a) => !isMinLengthAnnotation(a)).concat([
      makeMinLengthAnnotation(minLength)
    ])
