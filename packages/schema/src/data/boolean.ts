/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Annotation"
import * as internal from "@fp-ts/codec/internal/Schema"
import type * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const booleanId: unique symbol = Symbol.for(
  "@fp-ts/codec/data/boolean"
) as booleanId

/**
 * @since 1.0.0
 * @category symbol
 */
export type booleanId = typeof booleanId

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<boolean> = internal.declare([
  A.nameAnnotation("@fp-ts/codec/data/boolean"),
  A.idAnnotation(booleanId)
])

/**
 * @since 1.0.0
 */
export const isBoolean = (annotations: A.Annotations): boolean => {
  return pipe(
    A.find(annotations, A.isIdAnnotation),
    O.exists((annotation) => annotation.id === booleanId)
  )
}
