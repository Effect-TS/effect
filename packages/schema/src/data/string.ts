/**
 * @since 1.0.0
 */
import * as A from "@fp-ts/codec/Annotation"
import * as internal from "@fp-ts/codec/internal/Schema"
import type * as S from "@fp-ts/codec/Schema"
import { pipe } from "@fp-ts/data/Function"
import * as O from "@fp-ts/data/Option"

const stringId: unique symbol = Symbol.for(
  "@fp-ts/codec/data/string"
) as stringId

/**
 * @since 1.0.0
 * @category symbol
 */
export type stringId = typeof stringId

/**
 * @since 1.0.0
 */
export const Schema: S.Schema<string> = internal.declare([
  A.nameAnnotation("@fp-ts/codec/data/string"),
  A.idAnnotation(stringId)
])

/**
 * @since 1.0.0
 */
export const isString = (annotations: A.Annotations): boolean => {
  return pipe(
    A.find(annotations, A.isIdAnnotation),
    O.exists((annotation) => annotation.id === stringId)
  )
}
