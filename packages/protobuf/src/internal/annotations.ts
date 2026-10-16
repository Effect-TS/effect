/**
 * Annotation keys shared by the public modules and the layout compiler.
 *
 * PROTOTYPE.
 */
import type * as SchemaAST from "effect/SchemaAST"

/** @internal */
export const FieldKey = "~effect/protobuf/field"
/** @internal */
export const ScalarKey = "~effect/protobuf/scalar"
/** @internal */
export const WrapperKey = "~effect/protobuf/wrapper"
/** @internal */
export const EnumKey = "~effect/protobuf/enum"
/** @internal */
export const WktKey = "~effect/protobuf/wkt"

/**
 * Protobuf scalar value types.
 *
 * @stability unstable
 * @since 4.0.0
 */
export type ScalarType =
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
export interface FieldAnnotation {
  readonly number: number
  readonly name?: string | undefined
  readonly jsonName?: string | undefined
  readonly packed?: boolean | undefined
}

/**
 * Reads an annotation from the node itself or, because `annotate` on a checked
 * schema lands on the last check, from any of its checks.
 *
 * @internal
 */
export const getAnnotation = <A>(ast: SchemaAST.AST, key: string): A | undefined => {
  const own = ast.annotations?.[key]
  if (own !== undefined) return own as A
  const checks = ast.checks
  if (checks === undefined) return undefined
  for (let i = checks.length - 1; i >= 0; i--) {
    const found = findInCheck(checks[i], key)
    if (found !== undefined) return found as A
  }
  return undefined
}

const findInCheck = (check: SchemaAST.Check<any>, key: string): unknown => {
  const own = check.annotations?.[key]
  if (own !== undefined) return own
  if (check._tag === "FilterGroup") {
    for (const inner of check.checks) {
      const found = findInCheck(inner, key)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/** @internal */
export const protoCamelCase = (snakeCase: string): string => {
  let capNext = false
  let out = ""
  for (const c of snakeCase) {
    if (c === "_") {
      capNext = true
    } else if (c >= "0" && c <= "9") {
      out += c
      capNext = false
    } else if (capNext) {
      out += c.toUpperCase()
      capNext = false
    } else {
      out += c
    }
  }
  return out
}

/** @internal */
export const protoSnakeCase = (lowerCamelCase: string): string => {
  let out = ""
  for (let i = 0; i < lowerCamelCase.length; i++) {
    const c = lowerCamelCase[i]
    if (c >= "A" && c <= "Z") {
      if (i !== 0) out += "_"
      out += c.toLowerCase()
    } else {
      out += c
    }
  }
  return out
}
