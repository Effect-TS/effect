/**
 * @since 1.0.0
 */

import type { Predicate } from "@fp-ts/data/Predicate"
import type { NonEmptyReadonlyArray } from "@fp-ts/data/ReadonlyArray"

/**
 * `DecodeError` is a type that represents the different types of errors that can occur when decoding a value.
 *
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
  | Unexpected
  | Member

/**
 * The `Meta` variant of the `DecodeError` type allows users to attach custom metadata to a decode error.
 * This metadata can be any value, and is typically used to provide additional context or information about the error.
 * For example, you might use the `meta` field to include information about the expected type or shape of the value being decoded,
 * or to include a custom error message.
 *
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
 * The `Type` variant of the `DecodeError` type represents an error that occurs when the `actual` value is not of the expected type.
 * The `expected` field specifies the name of the expected type, and the `actual` field contains the value that caused the error.
 * This error can occur when trying to decode a value using a codec that is only able to decode values of a specific type,
 * and the actual value is not of that type. For example, if you are using a codec to decode a string value and the actual value
 * is a number, a `Type` decode error would be returned.
 *
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
 * The `Equal` variant of the `DecodeError` type represents an error that occurs when the `actual` value being decoded is not equal
 * to the `expected` value. This error is typically used when decoding a value that must match a specific value, such as a boolean or a
 * string literal. The `expected` field of the `Equal` error contains the expected value, and the `actual` field contains the value
 * that was actually encountered during decoding.
 *
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
 * The `Enums` variant of the `DecodeError` type represents an error that occurs when the `actual` value being decoded
 * is not one of the expected enum values. This error typically occurs when decoding a string or number value that is expected
 * to match one of a predefined set of values. The `enums` field of this error type is an array of tuples, where each tuple contains
 * a string representation of the expected enum value and its corresponding raw value.
 * The `actual` field contains the value that was actually encountered during decoding.
 * This error is often used in combination with the `S.enums` schema constructor,
 * which allows users to specify a set of allowed enum values for a decoded value.
 *
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
 * The `Refinement` variant of the `DecodeError` type indicates that the actual value did not pass a refinement check.
 * This error typically occurs when a `filter` function is used to further validate the shape or type of a value.
 * The `meta` field can be used to include additional information about the refinement,
 * such as the expected type or shape of the value, or a custom error message.
 *
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
 * The `Parse` variant of the `DecodeError` type represents an error that occurs when a value cannot be parsed
 * from one format to another. For example, this error might occur when attempting to parse a string as a number.
 * The `from` field specifies the format that the value is being parsed from, and the `to` field specifies the format
 * that the value is being parsed to. The `actual` field contains the value that caused the error.
 * This error is typically used in conjunction with the `parse` function from the `@fp-ts/schema/data/parser` module,
 * which allows users to define custom parsers for specific types or formats.
 *
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
 * The `Index` decode error indicates that there was an error at a specific index in an array or tuple.
 * The `errors` field contains the decode errors for that index. This error is typically used when decoding an array or tuple
 * with a schema that has constraints on the elements. For example, you might use an `Index` decode error to indicate
 * that a specific element in an array did not match the expected type or value.
 *
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
export const isIndex = (e: DecodeError): e is Index => e._tag === "Index"

/**
 * The `Key` variant of the `DecodeError` type represents an error that occurs when a key in an object is invalid.
 * This error typically occurs when the `actual` value is not a valid key type (e.g. a string or number)
 * or when the key is not present in the object being decoded. In either case, the `key` field of the error will contain
 * the invalid key value. This error is typically used in combination with the `Unexpected` error,
 * which indicates that an unexpected key was found in the object being decoded.
 *
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
export const isKey = (e: DecodeError): e is Key => e._tag === "Key"

/**
 * Error that occurs when a required key or index is missing.
 *
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
 * Error that occurs when an unexpected key or index is present.
 *
 * @since 1.0.0
 */
export interface Unexpected {
  readonly _tag: "Unexpected"
  readonly actual: unknown
}

/**
 * @since 1.0.0
 */
export const unexpected = (
  actual: unknown
): Unexpected => ({
  _tag: "Unexpected",
  actual
})

/**
 * @since 1.0.0
 */
export const isUnexpected = (e: DecodeError): e is Unexpected => e._tag === "Unexpected"

/**
 * Error that occurs when a member in a union has an error.
 *
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
