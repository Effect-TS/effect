/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import type * as Stream from "effect/Stream"
import type { Connection, Row } from "./Connection.js"
import type { SqlError } from "./Error.js"
import * as internal from "./internal/statement.js"

/**
 * @category type id
 * @since 1.0.0
 */
export const FragmentId: unique symbol = internal.FragmentId

/**
 * @category type id
 * @since 1.0.0
 */
export type FragmentId = typeof FragmentId

/**
 * @category model
 * @since 1.0.0
 */
export interface Fragment {
  readonly [FragmentId]: (_: never) => FragmentId
  readonly segments: ReadonlyArray<Segment>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Statement<A> extends Fragment, Effect<ReadonlyArray<A>, SqlError>, Pipeable {
  readonly withoutTransform: Effect<ReadonlyArray<A>, SqlError>
  readonly stream: Stream.Stream<A, SqlError>
  readonly values: Effect<ReadonlyArray<ReadonlyArray<Primitive>>, SqlError>
  readonly compile: () => readonly [
    sql: string,
    params: ReadonlyArray<Primitive>
  ]
}

/**
 * @category guard
 * @since 1.0.0
 */
export const isFragment: (u: unknown) => u is Fragment = internal.isFragment

/**
 * @category guard
 * @since 1.0.0
 */
export const isCustom: <A extends Custom<any, any, any, any>>(
  kind: A["kind"]
) => (u: unknown) => u is A = internal.isCustom

/**
 * @category model
 * @since 1.0.0
 */
export type Segment =
  | Literal
  | Identifier
  | Parameter
  | ArrayHelper
  | RecordInsertHelper
  | RecordUpdateHelper
  | RecordUpdateHelperSingle
  | Custom

/**
 * @category model
 * @since 1.0.0
 */
export interface Literal {
  readonly _tag: "Literal"
  readonly value: string
  readonly params?: ReadonlyArray<Primitive> | undefined
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Identifier {
  readonly _tag: "Identifier"
  readonly value: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Parameter {
  readonly _tag: "Parameter"
  readonly value: Primitive
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ArrayHelper {
  readonly _tag: "ArrayHelper"
  readonly value: ReadonlyArray<Primitive | Fragment>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordInsertHelper {
  readonly _tag: "RecordInsertHelper"
  readonly value: ReadonlyArray<Record<string, Primitive | Fragment>>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordUpdateHelper {
  readonly _tag: "RecordUpdateHelper"
  readonly value: ReadonlyArray<Record<string, Primitive | Fragment>>
  readonly alias: string
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordUpdateHelperSingle {
  readonly _tag: "RecordUpdateHelperSingle"
  readonly value: Record<string, Primitive | Fragment>
  readonly omit: ReadonlyArray<string>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Custom<
  T extends string = string,
  A = void,
  B = void,
  C = void
> {
  readonly _tag: "Custom"
  readonly kind: T
  readonly i0: A
  readonly i1: B
  readonly i2: C
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const custom: <C extends Custom<any, any, any, any>>(
  kind: C["kind"]
) => (i0: C["i0"], i1: C["i1"], i2: C["i2"]) => Fragment = internal.custom

/**
 * @category model
 * @since 1.0.0
 */
export type Primitive =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | Int8Array
  | Uint8Array

/**
 * @category model
 * @since 1.0.0
 */
export type PrimitiveKind =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "Date"
  | "null"
  | "Int8Array"
  | "Uint8Array"

/**
 * @category model
 * @since 1.0.0
 */
export type Helper =
  | ArrayHelper
  | RecordInsertHelper
  | RecordUpdateHelper
  | RecordUpdateHelperSingle
  | Identifier
  | Custom

/**
 * @category model
 * @since 1.0.0
 */
export type Argument = Primitive | Helper | Fragment

/**
 * @category model
 * @since 1.0.0
 */
export interface Constructor {
  <A extends object = Row>(
    strings: TemplateStringsArray,
    ...args: Array<Argument>
  ): Statement<A>

  (value: string): Identifier

  (
    value: ReadonlyArray<Primitive | Record<string, Primitive | Fragment>>
  ): ArrayHelper

  readonly insert: {
    (
      value: ReadonlyArray<Record<string, Primitive | Fragment>>
    ): RecordInsertHelper
    (value: Record<string, Primitive | Fragment>): RecordInsertHelper
  }

  readonly update: <A extends Record<string, Primitive | Fragment>>(
    value: A,
    omit?: ReadonlyArray<keyof A>
  ) => RecordUpdateHelperSingle

  readonly updateValues: (
    value: ReadonlyArray<Record<string, Primitive | Fragment>>,
    alias: string
  ) => RecordUpdateHelper
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make: (
  acquirer: Connection.Acquirer,
  compiler: Compiler
) => Constructor = internal.make

/**
 * @category constructor
 * @since 1.0.0
 */
export const unsafe: (
  acquirer: Connection.Acquirer,
  compiler: Compiler
) => <A extends object = Row>(
  sql: string,
  params?: ReadonlyArray<Primitive> | undefined
) => Statement<A> = internal.unsafe

/**
 * @category constructor
 * @since 1.0.0
 */
export const unsafeFragment: (
  sql: string,
  params?: ReadonlyArray<Primitive> | undefined
) => Fragment = internal.unsafeFragment

/**
 * @category constructor
 * @since 1.0.0
 */
export const and: (clauses: ReadonlyArray<string | Fragment>) => Fragment = internal.and

/**
 * @category constructor
 * @since 1.0.0
 */
export const or: (clauses: ReadonlyArray<string | Fragment>) => Fragment = internal.or

/**
 * @category constructor
 * @since 1.0.0
 */
export const csv: {
  (values: ReadonlyArray<string | Fragment>): Fragment
  (prefix: string, values: ReadonlyArray<string | Fragment>): Fragment
} = internal.csv

/**
 * @category constructor
 * @since 1.0.0
 */
export const join: (
  literal: string,
  addParens?: boolean,
  fallback?: string
) => (clauses: ReadonlyArray<string | Fragment>) => Fragment = internal.join

/**
 * @category model
 * @since 1.0.0
 */
export interface Compiler {
  readonly compile: (
    statement: Fragment
  ) => readonly [sql: string, params: ReadonlyArray<Primitive>]
}

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler: <C extends Custom<any, any, any, any> = any>(
  parameterPlaceholder: (index: number) => string,
  onIdentifier: (value: string) => string,
  onRecordUpdate: (
    placeholders: string,
    alias: string,
    columns: string,
    values: ReadonlyArray<ReadonlyArray<Primitive>>
  ) => readonly [sql: string, params: ReadonlyArray<Primitive>],
  onCustom: (
    type: C,
    placeholder: () => string
  ) => readonly [sql: string, params: ReadonlyArray<Primitive>],
  onInsert?: (
    columns: ReadonlyArray<string>,
    placeholders: string,
    values: ReadonlyArray<ReadonlyArray<Primitive>>
  ) => readonly [sql: string, binds: ReadonlyArray<Primitive>],
  onRecordUpdateSingle?: (
    columns: ReadonlyArray<string>,
    values: ReadonlyArray<Primitive>
  ) => readonly [sql: string, params: ReadonlyArray<Primitive>]
) => Compiler = internal.makeCompiler

/**
 * @since 1.0.0
 */
export const defaultEscape: (c: string) => (str: string) => string = internal.defaultEscape

/**
 * @since 1.0.0
 */
export const primitiveKind: (value: Primitive) => PrimitiveKind = internal.primitiveKind
