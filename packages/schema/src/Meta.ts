/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import { flatMap, isNonEmpty } from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export type Meta =
  | Apply // customisations
  | String // `string` data type
  | Number // `number` data type
  | Boolean // `boolean` data type
  | Of // examples: type literals
  | Struct // examples: `{ a: string, b: number  }`, `{ [_: string]: string }`, `{ a: string, b: string, [_: string]: string  }`
  | Tuple // examples: `[string, number]`, `[string, number, ...boolean[]]`
  | Union // examples: `string | number`
  | Lazy // recursive and mutually recursive data types

/**
 * @since 1.0.0
 */
export interface Annotations extends ReadonlyArray<unknown> {}

/**
 * @since 1.0.0
 */
export interface Apply {
  readonly _tag: "Apply"
  readonly symbol: symbol
  readonly metas: ReadonlyArray<Meta>
  readonly annotations: Annotations
}

/**
 * @since 1.0.0
 */
export const apply = (
  symbol: symbol,
  annotations: ReadonlyArray<unknown>,
  metas: ReadonlyArray<Meta>
): Apply => ({
  _tag: "Apply",
  symbol,
  annotations,
  metas
})

/**
 * @since 1.0.0
 */
export interface String {
  readonly _tag: "String"
  readonly minLength?: number
  readonly maxLength?: number
}

/**
 * @since 1.0.0
 */
export const string = (
  options: {
    readonly minLength?: number
    readonly maxLength?: number
  }
): String => ({ _tag: "String", ...options })

/**
 * @since 1.0.0
 */
export const isString = (meta: Meta): meta is String => meta._tag === "String"

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
): Number => ({ _tag: "Number", ...options })

/**
 * @since 1.0.0
 */
export const isNumber = (meta: Meta): meta is Number => meta._tag === "Number"

/**
 * @since 1.0.0
 */
export interface Boolean {
  readonly _tag: "Boolean"
}

/**
 * @since 1.0.0
 */
export const boolean: Boolean = { _tag: "Boolean" }

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
  readonly value: Meta
  readonly optional: boolean
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const field = (
  key: PropertyKey,
  value: Meta,
  optional: boolean,
  readonly: boolean
): Field => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface IndexSignature {
  readonly key: "string" | "number" | "symbol"
  readonly value: Meta
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignature = (
  key: "string" | "number" | "symbol",
  value: Meta,
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
): Struct => ({ _tag: "Struct", fields, indexSignature })

/**
 * @since 1.0.0
 */
export const isStruct = (meta: Meta): meta is Struct => meta._tag === "Struct"

/**
 * @since 1.0.0
 */
export interface Tuple {
  readonly _tag: "Tuple"
  readonly components: ReadonlyArray<Meta>
  readonly restElement: Option<Meta>
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const tuple = (
  components: ReadonlyArray<Meta>,
  restElement: Option<Meta>,
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
  readonly members: ReadonlyArray<Meta>
}

/**
 * @since 1.0.0
 */
export const union = (members: ReadonlyArray<Meta>): Union => ({
  _tag: "Union",
  members
})

/**
 * @since 1.0.0
 */
export interface Lazy {
  readonly _tag: "Lazy"
  readonly symbol: symbol // TODO: remove
  readonly f: () => Meta
}

/**
 * @since 1.0.0
 */
export const lazy = (symbol: symbol, f: () => Meta): Lazy => ({
  _tag: "Lazy",
  symbol,
  f
})

/**
 * @since 1.0.0
 */
export const isLazy = (meta: Meta): meta is Lazy => meta._tag === "Lazy"

/**
 * @since 1.0.0
 */
export const getFields = (
  meta: Meta
): ReadonlyArray<Field> => {
  switch (meta._tag) {
    case "Lazy":
      return getFields(meta.f())
    case "Struct":
      return meta.fields
    case "Union": {
      // TODO: handle indexSignatures
      const memberFields = meta.members.map(getFields)
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
