/**
 * @since 1.0.0
 */
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as IndexedDbQueryBuilder from "./IndexedDbQueryBuilder.js"

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
  out Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>> = never,
  out TableKeyPath extends IndexedDbQueryBuilder.KeyPath<TableSchema> = never,
  out TableAutoIncrement extends boolean = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options?: { keyPath: TableKeyPath; indexes: Indexes; autoIncrement: TableAutoIncrement }
}
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
export type AnyWithProps = IndexedDbTable<string, Schema.Schema.AnyNoContext, any, any, boolean>

/**
 * @since 1.0.0
 * @category models
 */
export type TableName<Table extends Any> = Table extends IndexedDbTable<
  infer _TableName,
  infer _Schema,
  infer _Indexes,
  infer _TableKeyPath,
  infer _TableAutoIncrement
> ? _TableName
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type KeyPath<Table extends Any> = Table extends IndexedDbTable<
  infer _TableName,
  infer _Schema,
  infer _Indexes,
  infer _TableKeyPath,
  infer _TableAutoIncrement
> ? _TableKeyPath
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type AutoIncrement<Table extends Any> = Table extends IndexedDbTable<
  infer _TableName,
  infer _Schema,
  infer _Indexes,
  infer _TableKeyPath,
  infer _TableAutoIncrement
> ? _TableAutoIncrement :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type TableSchema<Table extends Any> = Table extends IndexedDbTable<
  infer _TableName,
  infer _Schema,
  infer _Indexes,
  infer _TableKeyPath,
  infer _TableAutoIncrement
> ? _Schema
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Indexes<Table extends Any> = Table extends IndexedDbTable<
  infer _TableName,
  infer _Schema,
  infer _Indexes,
  infer _TableKeyPath,
  infer _TableAutoIncrement
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

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext,
  Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>,
  TableKeyPath extends IndexedDbQueryBuilder.KeyPath<TableSchema>,
  TableAutoIncrement extends boolean
>(options: {
  readonly tableName: TableName
  readonly tableSchema: TableSchema
  readonly options: Partial<{
    keyPath: TableKeyPath
    indexes: Indexes
    autoIncrement: TableAutoIncrement
  }>
}): IndexedDbTable<TableName, TableSchema, Indexes, TableKeyPath, TableAutoIncrement> => {
  function IndexedDbTable() {}
  Object.setPrototypeOf(IndexedDbTable, Proto)
  IndexedDbTable.tableName = options.tableName
  IndexedDbTable.tableSchema = options.tableSchema
  IndexedDbTable.options = options.options
  return IndexedDbTable as any
}

/**
 * - `keyPath: null`, `autoIncrement: false`: `key` is required
 * - `keyPath: null`, `autoIncrement: true`: `key` is optional
 * - `keyPath: string`, `autoIncrement: false`: `key` corresponds to `keyPath` and is required
 * - `keyPath: string`, `autoIncrement: true`: `key` corresponds to `keyPath` but is optional, when not provided an auto-generated key is assigned
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext,
  Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>,
  TableKeyPath extends IndexedDbQueryBuilder.KeyPath<TableSchema> = never,
  TableAutoIncrement extends boolean = false
>(
  tableName: TableName,
  tableSchema: TableSchema,
  options?: Partial<{ keyPath: TableKeyPath; indexes: Indexes; autoIncrement: TableAutoIncrement }>
): IndexedDbTable<TableName, TableSchema, Indexes, TableKeyPath, TableAutoIncrement> =>
  makeProto({ tableName, tableSchema, options: options ?? {} })
