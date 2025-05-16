/**
 * @since 1.0.0
 */
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import type * as IndexedDbTable from "./IndexedDbTable.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbVersion"
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
export interface IndexedDbVersion<
  out Tables extends IndexedDbTable.AnyWithProps = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly tables: ReadonlyMap<string, Tables>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Any {
  readonly [TypeId]: TypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export type AnyWithProps = IndexedDbVersion<IndexedDbTable.AnyWithProps>

/**
 * @since 1.0.0
 * @category models
 */
export type Tables<Db extends Any> = Db extends IndexedDbVersion<
  infer _Tables
> ? _Tables
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SchemaWithName<Db extends Any, TableName extends string> = IndexedDbTable.TableSchema<
  IndexedDbTable.WithName<
    Tables<Db>,
    TableName
  >
>

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Tables extends IndexedDbTable.AnyWithProps>(options: {
  readonly tables: ReadonlyMap<string, Tables>
}): IndexedDbVersion<Tables> => {
  function IndexedDbVersion() {}
  Object.setPrototypeOf(IndexedDbVersion, Proto)
  IndexedDbVersion.tables = options.tables
  return IndexedDbVersion as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Tables extends ReadonlyArray<IndexedDbTable.AnyWithProps>
>(
  ...tables: Tables & { 0: IndexedDbTable.AnyWithProps }
): IndexedDbVersion<Tables[number]> =>
  makeProto({
    tables: new Map(
      tables.map((table) => [table.tableName, table])
    )
  })
