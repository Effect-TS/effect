/**
 * @since 1.0.0
 */
import type { Annotations } from "@fp-ts/codec/Annotation"
import * as A from "@fp-ts/codec/Annotation"
import type { Decoder } from "@fp-ts/codec/Decoder"
import type { Encoder } from "@fp-ts/codec/Encoder"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import { flatMap, isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export type AST =
  | Declaration
  | Number
  | Of
  | Struct
  | Tuple
  | Union
  | Lazy
  | Refinement

/**
 * @since 1.0.0
 */
export interface Declaration {
  readonly _tag: "Declaration"
  readonly nodes: ReadonlyArray<AST>
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const declare = (
  annotations: ReadonlyArray<A.Annotation>,
  nodes: ReadonlyArray<AST>
): Declaration => ({
  _tag: "Declaration",
  annotations,
  nodes
})

/**
 * @since 1.0.0
 */
export interface Number {
  readonly _tag: "Number"
  readonly exclusiveMaximum?: number
  readonly exclusiveMinimum?: number
  readonly maximum?: number
  readonly minimum?: number
  readonly multipleOf?: number
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const number = (
  options: {
    readonly exclusiveMaximum?: number
    readonly exclusiveMinimum?: number
    readonly maximum?: number
    readonly minimum?: number
    readonly multipleOf?: number
  }
): Number => ({ _tag: "Number", ...options, annotations: [A.makeNameAnnotation("number")] })

/**
 * @since 1.0.0
 */
export const isNumber = (ast: AST): ast is Number => ast._tag === "Number"

/**
 * @since 1.0.0
 */
export interface Of {
  readonly _tag: "Of"
  readonly value: unknown
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const of = (value: unknown): Of => ({
  _tag: "Of",
  value,
  annotations: [A.makeNameAnnotation("<Of>")]
})

/**
 * @since 1.0.0
 */
export interface Field {
  readonly key: PropertyKey
  readonly value: AST
  readonly optional: boolean
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const field = (
  key: PropertyKey,
  value: AST,
  optional: boolean,
  readonly: boolean
): Field => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface IndexSignature {
  readonly key: "string" | "number" | "symbol"
  readonly value: AST
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  key: "string" | "number" | "symbol",
  value: AST,
  readonly: boolean
): IndexSignature => ({
  key,
  value,
  readonly
})

/**
 * @since 1.0.0
 */
export interface Struct {
  readonly _tag: "Struct"
  readonly fields: ReadonlyArray<Field>
  readonly indexSignature: Option<IndexSignature>
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const struct = (
  fields: ReadonlyArray<Field>,
  indexSignature: Option<IndexSignature>
): Struct => ({
  _tag: "Struct",
  fields,
  indexSignature,
  annotations: [A.makeNameAnnotation("<Struct>")]
})

/**
 * @since 1.0.0
 */
export const isStruct = (ast: AST): ast is Struct => ast._tag === "Struct"

/**
 * @since 1.0.0
 */
export interface Tuple {
  readonly _tag: "Tuple"
  readonly components: ReadonlyArray<AST>
  readonly restElement: Option<AST>
  readonly readonly: boolean
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const tuple = (
  components: ReadonlyArray<AST>,
  restElement: Option<AST>,
  readonly: boolean
): Tuple => ({
  _tag: "Tuple",
  components,
  restElement,
  readonly,
  annotations: [A.makeNameAnnotation("<Tuple>")]
})

/**
 * @since 1.0.0
 */
export interface Union {
  readonly _tag: "Union"
  readonly members: ReadonlyArray<AST>
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const union = (members: ReadonlyArray<AST>): Union => ({
  _tag: "Union",
  members,
  annotations: [A.makeNameAnnotation("<Union>")]
})

/**
 * @since 1.0.0
 */
export interface Refinement {
  readonly _tag: "Refinement"
  readonly from: AST
  readonly to: AST
  readonly decode: Decoder<any, any>["decode"]
  readonly encode: Encoder<any, any>["encode"]
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const refinement = (
  from: AST,
  to: AST,
  decode: Decoder<any, any>["decode"],
  encode: Encoder<any, any>["encode"]
): Refinement => ({
  _tag: "Refinement",
  from,
  to,
  decode,
  encode,
  annotations: [A.makeNameAnnotation("<Refinement>")]
})

/**
 * @since 1.0.0
 */
export interface Lazy {
  readonly _tag: "Lazy"
  readonly f: () => AST
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const lazy = (f: () => AST): Lazy => ({
  _tag: "Lazy",
  f,
  annotations: [A.makeNameAnnotation("<Lazy>")]
})

/**
 * @since 1.0.0
 */
export const isLazy = (ast: AST): ast is Lazy => ast._tag === "Lazy"

/**
 * @since 1.0.0
 */
export const getFields = (
  ast: AST
): ReadonlyArray<Field> => {
  switch (ast._tag) {
    case "Lazy":
      return getFields(ast.f())
    case "Struct":
      return ast.fields
    case "Union": {
      // TODO: handle indexSignatures
      const memberFields = ast.members.map(getFields)
      if (isNonEmpty(memberFields)) {
        const candidates = []
        const head = memberFields[0]
        const tail = memberFields.slice(1)
        for (const candidate of head) {
          if (tail.every((fields) => fields.some((field) => field.key === candidate.key))) {
            const members = pipe(
              tail,
              flatMap((fields) =>
                fields.filter((field) => field.key === candidate.key).map((field) => field.value)
              )
            )
            const optional = candidate.optional ||
              tail.some((fields) => fields.some((field) => field.optional))
            const readonly = candidate.readonly ||
              tail.some((fields) => fields.some((field) => field.readonly))
            candidates.push(field(
              candidate.key,
              union([candidate.value, ...members]),
              optional,
              readonly
            ))
          }
        }
        return candidates
      }
      return []
    }
    default:
      return []
  }
}
