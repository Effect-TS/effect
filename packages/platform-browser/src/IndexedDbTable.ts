/**
 * @since 1.0.0
 */
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { NoInfer } from "effect/Types"
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
  out Name extends string,
  out TableSchema extends AnySchemaStruct,
  out Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>,
  out KeyPath extends IDBValidKey,
  out AutoIncrement extends boolean
> extends Pipeable {
  new(_: never): {}
  readonly [TypeId]: TypeId
  readonly tableName: Name
  readonly tableSchema: TableSchema
  readonly keyPath: KeyPath
  readonly indexes: Indexes
  readonly autoIncrement: AutoIncrement
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AnySchemaStruct extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
  readonly annotations: any
  readonly fields: Schema.Struct.Fields
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
export type AnyWithProps = IndexedDbTable<string, AnySchemaStruct, any, any, boolean>

/**
 * @since 1.0.0
 * @category models
 */
export type TableName<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
> ? _Name
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type KeyPath<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
> ? _KeyPath
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type AutoIncrement<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
> ? _AutoIncrement :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type TableSchema<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
> ? _Schema
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Context<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
> ? _Schema["Context"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Indexes<Table extends Any> = Table extends IndexedDbTable<
  infer _Name,
  infer _Schema,
  infer _Indexes,
  infer _KeyPath,
  infer _AutoIncrement
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
  const Name extends string,
  TableSchema extends AnySchemaStruct,
  const Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>,
  const KeyPath extends IndexedDbQueryBuilder.KeyPath<TableSchema>,
  const AutoIncrement extends boolean
>(options: {
  readonly tableName: Name
  readonly tableSchema: TableSchema
  readonly keyPath: KeyPath
  readonly indexes: Indexes
  readonly autoIncrement: AutoIncrement
}): IndexedDbTable<Name, TableSchema, Indexes, KeyPath, AutoIncrement> => {
  function IndexedDbTable() {}
  Object.setPrototypeOf(IndexedDbTable, Proto)
  IndexedDbTable.tableName = options.tableName
  IndexedDbTable.tableSchema = options.tableSchema
  IndexedDbTable.keyPath = options.keyPath
  IndexedDbTable.indexes = options.indexes
  IndexedDbTable.autoIncrement = options.autoIncrement
  return IndexedDbTable as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Name extends string,
  TableSchema extends AnySchemaStruct,
  const Indexes extends Record<string, IndexedDbQueryBuilder.KeyPath<TableSchema>>,
  const KeyPath extends AutoIncrement extends true ? IndexedDbQueryBuilder.KeyPathNumber<NoInfer<TableSchema>>
    : IndexedDbQueryBuilder.KeyPath<NoInfer<TableSchema>>,
  const AutoIncrement extends boolean = false
>(options: {
  readonly name: Name
  readonly schema: TableSchema
  readonly keyPath: KeyPath
  readonly indexes?: Indexes | undefined
  readonly autoIncrement?: AutoIncrement | undefined
}): IndexedDbTable<Name, TableSchema, Indexes, Extract<KeyPath, IDBValidKey>, AutoIncrement> =>
  makeProto({
    tableName: options.name,
    tableSchema: options.schema,
    keyPath: options.keyPath as any,
    indexes: options.indexes ?? {} as Indexes,
    autoIncrement: options.autoIncrement ?? false as AutoIncrement
  })
