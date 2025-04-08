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

type KeyPath<TableSchema extends Schema.Schema.AnyNoContext> =
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
  out TableSchema extends Schema.Schema.AnyNoContext = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options?: {
    keyPath: KeyPath<TableSchema>
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
  export type AnyWithProps = IndexedDbTable<string, Schema.Schema.AnyNoContext>

  /**
   * @since 1.0.0
   * @category models
   */
  export type TableName<Table extends Any> = Table extends IndexedDbTable<
    infer _TableName,
    infer _Schema
  > ? _TableName
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type TableSchema<Table extends Any> = Table extends IndexedDbTable<
    infer _TableName,
    infer _Schema
  > ? _Schema
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
  TableSchema extends Schema.Schema.AnyNoContext
>(options: {
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options: Partial<{
    keyPath: KeyPath<TableSchema>
  }>
}): IndexedDbTable<TableName, TableSchema> => {
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
  TableSchema extends Schema.Schema.AnyNoContext
>(
  tableName: TableName,
  tableSchema: TableSchema,
  options?: {
    keyPath: KeyPath<TableSchema>
  }
): IndexedDbTable<TableName, TableSchema> => makeProto({ tableName, tableSchema, options: options ?? {} })
