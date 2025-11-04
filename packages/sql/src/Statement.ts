/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as FiberRefs from "effect/FiberRefs"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type * as Stream from "effect/Stream"
import type * as Tracer from "effect/Tracer"
import * as internal from "./internal/statement.js"
import type { Connection, Row } from "./SqlConnection.js"
import type { SqlError } from "./SqlError.js"

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
export type Dialect = "sqlite" | "pg" | "mysql" | "mssql" | "clickhouse"

/**
 * @category model
 * @since 1.0.0
 */
export interface Statement<A> extends Fragment, Effect<ReadonlyArray<A>, SqlError>, Pipeable {
  readonly raw: Effect<unknown, SqlError>
  readonly withoutTransform: Effect<ReadonlyArray<A>, SqlError>
  readonly stream: Stream.Stream<A, SqlError>
  readonly values: Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>
  readonly unprepared: Effect<ReadonlyArray<A>, SqlError>
  readonly compile: (withoutTransform?: boolean | undefined) => readonly [
    sql: string,
    params: ReadonlyArray<unknown>
  ]
}

/**
 * @category model
 * @since 1.0.0
 */
export declare namespace Statement {
  /**
   * @category model
   * @since 1.0.0
   */
  export type Transformer = (
    self: Statement<unknown>,
    sql: Constructor,
    context: FiberRefs.FiberRefs,
    span: Tracer.Span
  ) => Effect<Statement<unknown>>
}

/**
 * @category transformer
 * @since 1.0.0
 */
export const currentTransformer: FiberRef.FiberRef<Option.Option<Statement.Transformer>> = internal.currentTransformer

/**
 * @category transformer
 * @since 1.0.0
 */
export const withTransformer: {
  (
    f: Statement.Transformer
  ): <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R>
  <A, E, R>(
    effect: Effect<A, E, R>,
    f: Statement.Transformer
  ): Effect<A, E, R>
} = internal.withTransformer

/**
 * @category transformer
 * @since 1.0.0
 */
export const withTransformerDisabled: <A, E, R>(effect: Effect<A, E, R>) => Effect<A, E, R> =
  internal.withTransformerDisabled

/**
 * @category transformer
 * @since 1.0.0
 */
export const setTransformer: (f: Statement.Transformer) => Layer.Layer<never, never, never> = internal.setTransformer

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
  readonly params?: ReadonlyArray<unknown> | undefined
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
  readonly value: unknown
}

/**
 * @category model
 * @since 1.0.0
 */
export interface ArrayHelper {
  readonly _tag: "ArrayHelper"
  readonly value: ReadonlyArray<unknown | Fragment>
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordInsertHelper {
  readonly _tag: "RecordInsertHelper"
  readonly value: ReadonlyArray<Record<string, unknown>>
  /** @internal */
  readonly returningIdentifier: string | Fragment | undefined
  readonly returning: (sql: string | Identifier | Fragment) => RecordInsertHelper
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordUpdateHelper {
  readonly _tag: "RecordUpdateHelper"
  readonly value: ReadonlyArray<Record<string, unknown>>
  readonly alias: string
  /** @internal */
  readonly returningIdentifier: string | Fragment | undefined
  readonly returning: (sql: string | Identifier | Fragment) => RecordUpdateHelper
}

/**
 * @category model
 * @since 1.0.0
 */
export interface RecordUpdateHelperSingle {
  readonly _tag: "RecordUpdateHelperSingle"
  readonly value: Record<string, unknown>
  readonly omit: ReadonlyArray<string>
  /** @internal */
  readonly returningIdentifier: string | Fragment | undefined
  readonly returning: (sql: string | Identifier | Fragment) => RecordUpdateHelperSingle
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
export type PrimitiveKind =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "Date"
  | "null"
  | "Int8Array"
  | "Uint8Array"
  | "object"

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
export interface Constructor {
  <A extends object = Row>(
    strings: TemplateStringsArray,
    ...args: Array<any>
  ): Statement<A>

  (value: string): Identifier

  /**
   * Create unsafe SQL query
   */
  readonly unsafe: <A extends object>(
    sql: string,
    params?: ReadonlyArray<any> | undefined
  ) => Statement<A>

  readonly literal: (sql: string) => Fragment

  readonly in: {
    (value: ReadonlyArray<unknown>): ArrayHelper
    (column: string, value: ReadonlyArray<unknown>): Fragment
  }

  readonly insert: {
    (
      value: ReadonlyArray<Record<string, unknown>>
    ): RecordInsertHelper
    (value: Record<string, unknown>): RecordInsertHelper
  }

  /** Update a single row */
  readonly update: <A extends Record<string, unknown>>(
    value: A,
    omit?: ReadonlyArray<keyof A>
  ) => RecordUpdateHelperSingle

  /**
   * Update multiple rows
   *
   * **Note:** Not supported in sqlite
   */
  readonly updateValues: (
    value: ReadonlyArray<Record<string, unknown>>,
    alias: string
  ) => RecordUpdateHelper

  /**
   * Create an `AND` chain for a where clause
   */
  readonly and: (clauses: ReadonlyArray<string | Fragment>) => Fragment

  /**
   * Create an `OR` chain for a where clause
   */
  readonly or: (clauses: ReadonlyArray<string | Fragment>) => Fragment

  /**
   * Create comma seperated values, with an optional prefix
   *
   * Useful for `ORDER BY` and `GROUP BY` clauses
   */
  readonly csv: {
    (values: ReadonlyArray<string | Fragment>): Fragment
    (prefix: string, values: ReadonlyArray<string | Fragment>): Fragment
  }

  readonly join: (
    literal: string,
    addParens?: boolean,
    fallback?: string
  ) => (clauses: ReadonlyArray<string | Fragment>) => Fragment

  readonly onDialect: <A, B, C, D, E>(options: {
    readonly sqlite: () => A
    readonly pg: () => B
    readonly mysql: () => C
    readonly mssql: () => D
    readonly clickhouse: () => E
  }) => A | B | C | D | E

  readonly onDialectOrElse: <A, B = never, C = never, D = never, E = never, F = never>(options: {
    readonly orElse: () => A
    readonly sqlite?: () => B
    readonly pg?: () => C
    readonly mysql?: () => D
    readonly mssql?: () => E
    readonly clickhouse?: () => F
  }) => A | B | C | D | E | F
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make: (
  acquirer: Connection.Acquirer,
  compiler: Compiler,
  spanAttributes: ReadonlyArray<readonly [string, unknown]>,
  transformRows: (<A extends object>(row: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
) => Constructor = internal.make

/**
 * @category constructor
 * @since 1.0.0
 */
export const unsafeFragment: (
  sql: string,
  params?: ReadonlyArray<unknown> | undefined
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
 * @category compiler
 * @since 1.0.0
 */
export interface Compiler {
  readonly dialect: Dialect
  readonly compile: (
    statement: Fragment,
    withoutTransform: boolean
  ) => readonly [sql: string, params: ReadonlyArray<unknown>]
  readonly withoutTransform: this
}

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompiler: <C extends Custom<any, any, any, any> = any>(
  options: {
    readonly dialect: Dialect
    readonly placeholder: (index: number, value: unknown) => string
    readonly onIdentifier: (value: string, withoutTransform: boolean) => string
    readonly onRecordUpdate: (
      placeholders: string,
      alias: string,
      columns: string,
      values: ReadonlyArray<ReadonlyArray<unknown>>,
      returning: readonly [sql: string, params: ReadonlyArray<unknown>] | undefined
    ) => readonly [sql: string, params: ReadonlyArray<unknown>]
    readonly onCustom: (
      type: C,
      placeholder: (u: unknown) => string,
      withoutTransform: boolean
    ) => readonly [sql: string, params: ReadonlyArray<unknown>]
    readonly onInsert?: (
      columns: ReadonlyArray<string>,
      placeholders: string,
      values: ReadonlyArray<ReadonlyArray<unknown>>,
      returning: readonly [sql: string, params: ReadonlyArray<unknown>] | undefined
    ) => readonly [sql: string, binds: ReadonlyArray<unknown>]
    readonly onRecordUpdateSingle?: (
      columns: ReadonlyArray<string>,
      values: ReadonlyArray<unknown>,
      returning: readonly [sql: string, params: ReadonlyArray<unknown>] | undefined
    ) => readonly [sql: string, params: ReadonlyArray<unknown>]
  }
) => Compiler = internal.makeCompiler

/**
 * @category compiler
 * @since 1.0.0
 */
export const makeCompilerSqlite: (transform?: ((_: string) => string) | undefined) => Compiler =
  internal.makeCompilerSqlite

/**
 * @since 1.0.0
 */
export const defaultEscape: (c: string) => (str: string) => string = internal.defaultEscape

/**
 * @since 1.0.0
 */
export const primitiveKind: (value: unknown) => PrimitiveKind = internal.primitiveKind

/**
 * @since 1.0.0
 */
export const defaultTransforms: (
  transformer: (str: string) => string,
  nested?: boolean
) => {
  readonly value: (value: any) => any
  readonly object: (obj: Record<string, any>) => any
  readonly array: <A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>
} = internal.defaultTransforms
