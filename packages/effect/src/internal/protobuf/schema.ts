// What the codec reads from schemas: the protobuf annotations, the encoded side
// of a node, and whether the wire layer alone proves a schema.

import * as Predicate from "../../Predicate.ts"
import type * as SchemaAST from "../../SchemaAST.ts"
import type * as L from "./layout.ts"

/** @internal */
export const FIELD = "~effect/encoding/Protobuf/field"
/** @internal */
export const SCALAR = "~effect/encoding/Protobuf/scalar"
/** @internal */
export const MAP = "~effect/encoding/Protobuf/map"
/** @internal */
export const MESSAGE = "~effect/encoding/Protobuf/message"
/** @internal */
export const MESSAGE_SET = "~effect/encoding/Protobuf/messageSet"
/** @internal */
export const ONEOF = "~effect/encoding/Protobuf/oneof"
/** @internal */
export const ENUM = "~effect/encoding/Protobuf/enum"
/** @internal */
export const WKT = "~effect/encoding/Protobuf/wkt"
/** @internal */
export const UNKNOWN = "~effect/encoding/Protobuf/unknown"
// Marks the checks of the protobuf scalars, which the wire layer enforces on
// its own.
/** @internal */
export const PROVEN = "~effect/encoding/Protobuf/proven"

/** @internal */
export const MAX_FIELD_NUMBER = 536_870_911 // 2 ** 29 - 1

/** @internal */
export interface FieldOptions {
  readonly packed: boolean | undefined
  readonly required: boolean | undefined
  readonly delimited: boolean | undefined
  readonly validateUtf8: boolean | undefined
  // The `[default = …]` of the field, which the codec does not read.
  readonly default: unknown
}

/** @internal */
export interface FieldAnnotation extends FieldOptions {
  readonly number: number
}

/** @internal */
export interface EnumAnnotation {
  // Enum numbers by value, in declaration order.
  readonly numbers: ReadonlyArray<readonly [value: string, number: number]>
  readonly open: boolean
  readonly name: string
}

// The layout of a well-known type, which its schema carries.
/** @internal */
export type WellKnown = L.MessageType | L.Converted

/** @internal */
export type ScalarName =
  | "double"
  | "float"
  | "int32"
  | "uint32"
  | "sint32"
  | "fixed32"
  | "sfixed32"
  | "int64"
  | "uint64"
  | "sint64"
  | "fixed64"
  | "sfixed64"
  | "bool"
  | "string"
  | "bytes"

/** @internal */
export const isUnsigned = (scalar: ScalarName): boolean => {
  return scalar === "uint32" || scalar === "fixed32" || scalar === "uint64" || scalar === "fixed64"
}

/** @internal */
export const is64Bit = (scalar: ScalarName): boolean => {
  return scalar === "int64" || scalar === "uint64" || scalar === "sint64" || scalar === "fixed64" ||
    scalar === "sfixed64"
}

/** @internal */
export const checkFieldNumber = (number: number): void => {
  if (!Number.isInteger(number) || number < 1 || number > MAX_FIELD_NUMBER || (number >= 19000 && number <= 19999)) {
    throw new Error(
      `Protobuf field number must be an integer in [1, ${MAX_FIELD_NUMBER}] outside [19000, 19999], got ${number}`
    )
  }
}

// -----------------------------------------------------------------------------
// reading annotations
// -----------------------------------------------------------------------------

/**
 * The encoded side of a node, reached through its encoding chain and
 * suspensions.
 *
 * @internal
 */
export interface Resolved {
  readonly ast: SchemaAST.AST
  // The protobuf annotations of the encoding chain; the outermost wins.
  readonly annotations: Readonly<Record<string, unknown>>
}

const RESOLVED_KEYS = [
  SCALAR,
  MAP,
  MESSAGE,
  MESSAGE_SET,
  ONEOF,
  ENUM,
  WKT,
  UNKNOWN
]

/** @internal */
export const resolveEncoded = (ast: SchemaAST.AST): Resolved => {
  let annotations: Record<string, unknown> | undefined
  while (true) {
    for (const key of RESOLVED_KEYS) {
      if (annotations?.[key] !== undefined) continue
      const value = getAnnotation(ast, key)
      if (value !== undefined) (annotations ??= {})[key] = value
    }
    if (ast.encoding !== undefined) {
      ast = ast.encoding[ast.encoding.length - 1].to
    } else if (ast._tag === "Suspend") {
      ast = ast.thunk()
    } else {
      return { ast, annotations: annotations ?? {} }
    }
  }
}

// `annotate` on a checked schema lands on its last check, so annotations are
// looked up on the node and then on its checks.
const getAnnotation = (ast: SchemaAST.AST, key: string): unknown => {
  const own = ast.annotations?.[key]
  if (own !== undefined || ast.checks === undefined) return own
  for (let i = ast.checks.length - 1; i >= 0; i--) {
    const found = getCheckAnnotation(ast.checks[i], key)
    if (found !== undefined) return found
  }
  return undefined
}

const getCheckAnnotation = (check: SchemaAST.Check<any>, key: string): unknown => {
  const own = check.annotations?.[key]
  if (own !== undefined || check._tag !== "FilterGroup") return own
  for (const inner of check.checks) {
    const found = getCheckAnnotation(inner, key)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * The field number of a property or oneof case. Key annotations live on the
 * outer node, or on a link of its encoding chain.
 *
 * @internal
 */
export const getFieldAnnotation = (ast: SchemaAST.AST): FieldAnnotation | undefined => {
  while (true) {
    const found = ast.context?.annotations?.[FIELD]
    if (found !== undefined) return found as FieldAnnotation
    if (ast.encoding === undefined) return undefined
    ast = ast.encoding[ast.encoding.length - 1].to
  }
}

/** @internal */
export const representationId = (ast: SchemaAST.AST): string | undefined => {
  const representation = ast.annotations?.representation
  return Predicate.isObject(representation) && typeof representation.id === "string" ? representation.id : undefined
}

// -----------------------------------------------------------------------------
// exactness
// -----------------------------------------------------------------------------

/**
 * Whether the wire layer alone produces and validates every value of a
 * schema, so that the Schema pass around it would only repeat its work. Such a
 * schema has no transformation, and no check other than the proven ones of the
 * protobuf scalars.
 *
 * @internal
 */
export const isExact = (root: SchemaAST.AST): boolean => {
  // A suspend that is still being walked counts as exact: if nothing else in
  // the cycle disqualifies it, the whole cycle is exact.
  const walked = new Map<SchemaAST.AST, boolean>()
  const exact = (ast: SchemaAST.AST): boolean => {
    if (ast.encoding !== undefined || (ast.checks !== undefined && !ast.checks.every(isProven))) return false
    // The well-known types are decoded and checked by the wire layer.
    if (getAnnotation(ast, WKT) !== undefined) return true
    switch (ast._tag) {
      case "String":
      case "Boolean":
      case "Number":
      case "BigInt":
      case "Literal":
        return true
      case "Objects":
        return ast.propertySignatures.every((ps) => exact(ps.type)) &&
          ast.indexSignatures.every((signature) => exact(signature.parameter) && exact(signature.type))
      case "Arrays":
        return ast.elements.length === 0 && ast.rest.every(exact)
      case "Union":
        return (ast.options?.mode ?? "anyOf") === "anyOf" && ast.types.every(exact)
      case "Suspend": {
        const seen = walked.get(ast)
        if (seen !== undefined) return seen
        walked.set(ast, true)
        const result = exact(ast.thunk())
        walked.set(ast, result)
        return result
      }
      case "Declaration":
        return representationId(ast) === "effect/schema/Uint8Array"
      default:
        return false
    }
  }
  return exact(root)
}

const isProven = (check: SchemaAST.Check<any>): boolean => {
  return check.annotations?.[PROVEN] === true
}
