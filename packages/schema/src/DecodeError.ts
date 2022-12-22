/**
 * @since 1.0.0
 */

import type { Predicate } from "@fp-ts/data/Predicate"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export type DecodeError =
  | Meta
  | Type
  | Equal
  | Enums
  | Refinement
  | Parse
  | Index
  | Key
  | Missing
  | UnexpectedKey
  | UnexpectedIndex
  | Member

/**
 * @since 1.0.0
 */
export interface Meta {
  readonly _tag: "Meta"
  readonly meta: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const meta = (
  meta: unknown,
  actual: unknown
): Meta => ({
  _tag: "Meta",
  meta,
  actual
})

/**
 * @since 1.0.0
 */
export interface Type {
  readonly _tag: "Type"
  readonly expected: string
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const type = (expected: string, actual: unknown): Type => ({
  _tag: "Type",
  expected,
  actual
})

/**
 * @since 1.0.0
 */
export interface Equal {
  readonly _tag: "Equal"
  readonly expected: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const equal = (
  expected: unknown,
  actual: unknown
): Equal => ({ _tag: "Equal", expected, actual })

/**
 * @since 1.0.0
 */
export interface Enums {
  readonly _tag: "Enums"
  readonly enums: ReadonlyArray<readonly [string, string | number]>
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const enums = (
  enums: ReadonlyArray<readonly [string, string | number]>,
  actual: unknown
): Enums => ({ _tag: "Enums", enums, actual })

/**
 * @since 1.0.0
 */
export interface Refinement {
  readonly _tag: "Refinement"
  readonly meta: unknown
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const refinement = (meta: unknown, actual: unknown): Refinement => ({
  _tag: "Refinement",
  meta,
  actual
})

/**
 * @since 1.0.0
 */
export interface Parse {
  readonly _tag: "Parse"
  readonly from: string
  readonly to: string
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const parse = (from: string, to: string, actual: unknown): Parse => ({
  _tag: "Parse",
  from,
  to,
  actual
})

/**
 * @since 1.0.0
 */
export interface Index {
  readonly _tag: "Index"
  readonly index: number
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const index = (
  index: number,
  errors: NonEmptyReadonlyArray<DecodeError>
): Index => ({
  _tag: "Index",
  index,
  errors
})

/**
 * @since 1.0.0
 */
export interface Key {
  readonly _tag: "Key"
  readonly key: PropertyKey
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const key = (
  key: PropertyKey,
  errors: NonEmptyReadonlyArray<DecodeError>
): Key => ({
  _tag: "Key",
  key,
  errors
})

/**
 * @since 1.0.0
 */
export interface Missing {
  readonly _tag: "Missing"
}

/**
 * @since 1.0.0
 */
export const missing: Missing = { _tag: "Missing" }

/**
 * @since 1.0.0
 */
export interface UnexpectedKey {
  readonly _tag: "UnexpectedKey"
  readonly key: PropertyKey
}

/**
 * @since 1.0.0
 */
export const unexpectedKey = (
  key: PropertyKey
): UnexpectedKey => ({
  _tag: "UnexpectedKey",
  key
})

/**
 * @since 1.0.0
 */
export interface UnexpectedIndex {
  readonly _tag: "UnexpectedIndex"
  readonly index: number
}

/**
 * @since 1.0.0
 */
export const unexpectedIndex = (
  index: number
): UnexpectedIndex => ({
  _tag: "UnexpectedIndex",
  index
})

/**
 * @since 1.0.0
 */
export interface Member {
  readonly _tag: "Member"
  readonly errors: NonEmptyReadonlyArray<DecodeError>
}

/**
 * @since 1.0.0
 */
export const member = (
  errors: NonEmptyReadonlyArray<DecodeError>
): Member => ({
  _tag: "Member",
  errors
})

/**
 * @since 1.0.0
 */
export const some = (
  predicate: Predicate<DecodeError>
): (errors: NonEmptyReadonlyArray<DecodeError>) => boolean => {
  const go = (e: DecodeError): boolean => {
    switch (e._tag) {
      case "Index":
      case "Key":
      case "Member":
        return gos(e.errors)
      default:
        return predicate(e)
    }
  }
  const gos = (errors: NonEmptyReadonlyArray<DecodeError>): boolean => {
    return errors.some(go)
  }
  return gos
}
