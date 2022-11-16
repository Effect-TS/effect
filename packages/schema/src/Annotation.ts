/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Annotations extends ReadonlyArray<unknown> {}

/**
 * @since 1.0.0
 */
export const find = <A>(
  annotations: Annotations,
  is: (annotation: unknown) => annotation is A
): Option<A> => pipe(annotations, RA.findFirst(is))

const NameAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/NameAnnotation"
) as NameAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type NameAnnotationId = typeof NameAnnotationId

/**
 * @since 1.0.0
 */
export interface NameAnnotation {
  readonly _id: NameAnnotationId
  readonly name: string
}

/**
 * @since 1.0.0
 */
export const isNameAnnotation = (u: unknown): u is NameAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === NameAnnotationId

/**
 * @since 1.0.0
 */
export const nameAnnotation = (name: string): NameAnnotation => ({ _id: NameAnnotationId, name })

/**
 * @since 1.0.0
 */
export const getName = (annotations: Annotations): Option<string> =>
  pipe(find(annotations, isNameAnnotation), O.map((a) => a.name))

const IdAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/codec/IdAnnotation"
) as IdAnnotationId

/**
 * @since 1.0.0
 * @category symbol
 */
export type IdAnnotationId = typeof IdAnnotationId

/**
 * @since 1.0.0
 */
export interface IdAnnotation {
  readonly _id: IdAnnotationId
  readonly id: symbol
}

/**
 * @since 1.0.0
 */
export const isIdAnnotation = (u: unknown): u is IdAnnotation =>
  typeof u === "object" && u != null && "_id" in u && u["_id"] === IdAnnotationId

/**
 * @since 1.0.0
 */
export const idAnnotation = (id: symbol): IdAnnotation => ({ _id: IdAnnotationId, id })
