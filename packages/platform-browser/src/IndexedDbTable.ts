/**
 * @since 1.0.0
 */
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"

type IsValidIndexedDbKeyType<T> = T extends number | string | Date | ArrayBuffer | ArrayBufferView ? true :
  T extends Array<infer U> ? IsValidIndexedDbKeyType<U>
  : false

type IndexedDbValidKeys<TableSchema extends Schema.Schema.AnyNoContext> = {
  [K in keyof Schema.Schema.Encoded<TableSchema>]: K extends string
    ? IsValidIndexedDbKeyType<Schema.Schema.Encoded<TableSchema>[K]> extends true ? K
    : never
    : never
}[keyof Schema.Schema.Encoded<TableSchema>]

/** @internal */
export type KeyPath<TableSchema extends Schema.Schema.AnyNoContext> =
  | IndexedDbValidKeys<TableSchema>
  | Array<IndexedDbValidKeys<TableSchema>>

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbTable"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category interface
 */
export interface IndexedDbTable<
  out TableName extends string,
  out TableSchema extends Schema.Schema.AnyNoContext = never,
  out Indexes extends Record<string, KeyPath<TableSchema>> = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options?: {
    keyPath: KeyPath<TableSchema>
    indexes: Indexes
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbTable {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
    readonly tableName: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = IndexedDbTable<string, Schema.Schema.AnyNoContext, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type TableName<Table extends Any> = Table extends IndexedDbTable<
    infer _TableName,
    infer _Schema,
    infer _Indexes
  > ? _TableName
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type TableSchema<Table extends Any> = Table extends IndexedDbTable<
    infer _TableName,
    infer _Schema,
    infer _Indexes
  > ? _Schema
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Indexes<Table extends Any> = Table extends IndexedDbTable<
    infer _TableName,
    infer _Schema,
    infer _Indexes
  > ? _Indexes
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Table extends Any, TableName extends string> = Extract<
    Table,
    { readonly tableName: TableName }
  >
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext,
  Indexes extends Record<string, KeyPath<TableSchema>>
>(options: {
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options: Partial<{
    keyPath: KeyPath<TableSchema>
    indexes: Indexes
  }>
}): IndexedDbTable<TableName, TableSchema, Indexes> => {
  function IndexedDbTable() {}
  Object.setPrototypeOf(IndexedDbTable, Proto)
  IndexedDbTable.tableName = options.tableName
  IndexedDbTable.tableSchema = options.tableSchema
  IndexedDbTable.options = options.options
  return IndexedDbTable as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext,
  Indexes extends Record<string, KeyPath<TableSchema>>
>(
  tableName: TableName,
  tableSchema: TableSchema,
  options?: Partial<{
    keyPath: KeyPath<TableSchema>
    indexes: Indexes
  }>
): IndexedDbTable<TableName, TableSchema, Indexes> => makeProto({ tableName, tableSchema, options: options ?? {} })
