/**
 * @since 1.0.0
 */
import type * as C from "@fp-ts/data/Context"
import type { Option } from "@fp-ts/data/Option"

/**
 * A sum type representing features of the TypeScript language we are interested in.
 *
 * @since 1.0.0
 */
export type DSL =
  | ConstructorDSL
  | StringDSL
  | NumberDSL
  | BooleanDSL
  | LiteralDSL
  | ArrayDSL
  | StructDSL
  | IndexSignatureDSL
  | TupleDSL
  | UnionDSL

/**
 * @since 1.0.0
 */
export interface ConstructorDSL {
  readonly _tag: "ConstructorDSL"
  readonly tag: C.Tag<any>
  readonly type: DSL
}

/**
 * @since 1.0.0
 */
export const constructorDSL = (tag: C.Tag<any>, type: DSL): ConstructorDSL => ({
  _tag: "ConstructorDSL",
  tag,
  type
})

/**
 * @since 1.0.0
 */
export interface StringDSL {
  readonly _tag: "StringDSL"
}

/**
 * @since 1.0.0
 */
export const stringDSL: StringDSL = { _tag: "StringDSL" }

/**
 * @since 1.0.0
 */
export interface NumberDSL {
  readonly _tag: "NumberDSL"
}

/**
 * @since 1.0.0
 */
export const numberDSL: NumberDSL = { _tag: "NumberDSL" }

/**
 * @since 1.0.0
 */
export interface BooleanDSL {
  readonly _tag: "BooleanDSL"
}

/**
 * @since 1.0.0
 */
export const booleanDSL: BooleanDSL = { _tag: "BooleanDSL" }

/**
 * @since 1.0.0
 */
export type Literal = string | number | boolean | null | undefined | symbol

/**
 * @since 1.0.0
 */
export interface LiteralDSL {
  readonly _tag: "LiteralDSL"
  readonly literal: Literal
}

/**
 * @since 1.0.0
 */
export const literalDSL = (literal: Literal): LiteralDSL => ({
  _tag: "LiteralDSL",
  literal
})

/**
 * @since 1.0.0
 */
export interface ArrayDSL {
  readonly _tag: "ArrayDSL"
  readonly item: DSL
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const arrayDSL = (item: DSL, readonly: boolean): ArrayDSL => ({
  _tag: "ArrayDSL",
  item,
  readonly
})

/**
 * @since 1.0.0
 */
export interface FieldDSL {
  readonly key: PropertyKey
  readonly value: DSL
  readonly optional: boolean
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const fieldDSL = (
  key: PropertyKey,
  value: DSL,
  optional: boolean,
  readonly: boolean
): FieldDSL => ({ key, value, optional, readonly })

/**
 * @since 1.0.0
 */
export interface StructDSL {
  readonly _tag: "StructDSL"
  readonly fields: ReadonlyArray<FieldDSL>
}

/**
 * @since 1.0.0
 */
export const structDSL = (
  fields: ReadonlyArray<FieldDSL>
): StructDSL => ({ _tag: "StructDSL", fields })

/**
 * @since 1.0.0
 */
export interface IndexSignatureDSL {
  readonly _tag: "IndexSignatureDSL"
  readonly key: "string" | "number" | "symbol"
  readonly value: DSL
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const indexSignatureDSL = (
  key: "string" | "number" | "symbol",
  value: DSL,
  readonly: boolean
): IndexSignatureDSL => ({
  _tag: "IndexSignatureDSL",
  key,
  value,
  readonly
})

/**
 * @since 1.0.0
 */
export interface TupleDSL {
  readonly _tag: "TupleDSL"
  readonly components: ReadonlyArray<DSL>
  readonly restElement: Option<ArrayDSL>
  readonly readonly: boolean
}

/**
 * @since 1.0.0
 */
export const tupleDSL = (
  components: ReadonlyArray<DSL>,
  restElement: Option<ArrayDSL>,
  readonly: boolean
): TupleDSL => ({
  _tag: "TupleDSL",
  components,
  restElement,
  readonly
})

/**
 * @since 1.0.0
 */
export interface UnionDSL {
  readonly _tag: "UnionDSL"
  readonly members: ReadonlyArray<DSL>
}

/**
 * @since 1.0.0
 */
export const unionDSL = (members: ReadonlyArray<DSL>): UnionDSL => ({
  _tag: "UnionDSL",
  members
})
