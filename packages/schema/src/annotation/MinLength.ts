/**
 * @since 1.0.0
 */

import type { Annotations } from "@fp-ts/codec/Annotation"
import * as A from "@fp-ts/codec/Annotation"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

const AnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/annotation/MinLength"
) as AnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type AnnotationId = typeof AnnotationId

/**
 * @since 1.0.0
 */
export interface MinLengthAnnotation {
  readonly _id: AnnotationId
  readonly minLength: number
}

/**
 * @since 1.0.0
 */
export const make = (minLength: number): MinLengthAnnotation => ({
  _id: AnnotationId,
  minLength
})

/**
 * @since 1.0.0
 */
export const is = (u: unknown): u is MinLengthAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === AnnotationId

/**
 * @since 1.0.0
 */
export const get = (annotations: Annotations): Option<number> =>
  pipe(A.find(annotations, is), O.map((a) => a.minLength))

/**
 * @since 1.0.0
 */
export const add = (minLength: number) =>
  (annotations: Annotations): Annotations =>
    annotations.filter((a) => !is(a)).concat([make(minLength)])
