/**
 * @since 1.0.0
 */

import type { Provider } from "@fp-ts/codec/Provider"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import { flatMap, isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export type AST =
  | Declaration
  | Of
  | Struct
  | Tuple
  | Union
  | Lazy

/**
 * @since 1.0.0
 */
export interface Declaration {
  readonly _tag: "Declaration"
  readonly id: symbol
  readonly config: Option<unknown>
  readonly provider: Provider
  readonly nodes: ReadonlyArray<AST>
}

/**
 * @since 1.0.0
 */
export const declare = (
  id: symbol,
  config: Option<unknown>,
  provider: Provider,
  nodes: ReadonlyArray<AST>
): Declaration => ({
  _tag: "Declaration",
  id,
  config,
  provider,
  nodes
})

/**
 * @since 1.0.0
 */
export const isDeclaration = (ast: AST): ast is Declaration => ast._tag === "Declaration"

/**
 * @since 1.0.0
 */
export interface Of {
  readonly _tag: "Of"
  readonly value: unknown
}

/**
 * @since 1.0.0
 */
export const of = (value: unknown): Of => ({
  _tag: "Of",
  value
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
  indexSignature
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
  readonly
})

/**
 * @since 1.0.0
 */
export interface Union {
  readonly _tag: "Union"
  readonly members: ReadonlyArray<AST>
}

/**
 * @since 1.0.0
 */
export const union = (members: ReadonlyArray<AST>): Union => ({
  _tag: "Union",
  members
})

/**
 * @since 1.0.0
 */
export interface Lazy {
  readonly _tag: "Lazy"
  readonly f: () => AST
}

/**
 * @since 1.0.0
 */
export const lazy = (f: () => AST): Lazy => ({
  _tag: "Lazy",
  f
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
