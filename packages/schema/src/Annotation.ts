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

/**
 * @since 1.0.0
 */
export interface NameAnnotation {
  readonly _tag: "NameAnnotation"
  readonly name: string
}

/**
 * @since 1.0.0
 */
export const isNameAnnotation = (u: unknown): u is NameAnnotation =>
  u !== null && typeof u === "object" && ("_tag" in u) && (u["_tag"] === "NameAnnotation")

/**
 * @since 1.0.0
 */
export const getName = (annotations: Annotations): Option<string> =>
  pipe(find(annotations, isNameAnnotation), O.map((a) => a.name))

/**
 * @since 1.0.0
 */
export const nameAnnotation = (name: string): NameAnnotation => ({ _tag: "NameAnnotation", name })
