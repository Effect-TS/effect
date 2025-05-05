/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbQuery from "./IndexedDbQuery.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import * as internal from "./internal/indexedDbQuery.js"

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
  out Tables extends IndexedDbTable.IndexedDbTable.Any = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly tables: HashMap.HashMap<string, Tables>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbVersion {
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
  export type AnyWithProps = IndexedDbVersion<IndexedDbTable.IndexedDbTable.AnyWithProps>

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
  export type SchemaWithName<Db extends Any, TableName extends string> = IndexedDbTable.IndexedDbTable.TableSchema<
    IndexedDbTable.IndexedDbTable.WithName<
      Tables<Db>,
      TableName
    >
  >
}

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDbApi extends Context.Tag(
  "@effect/platform-browser/IndexedDbApi"
)<
  IndexedDbApi,
  {
    readonly use: <A>(
      f: (database: globalThis.IDBDatabase) => Promise<A>
    ) => Effect.Effect<A, internal.IndexedDbQueryError>

    readonly makeApi: <
      Source extends IndexedDbVersion.AnyWithProps = never
    >(source: Source) => IndexedDbQuery.IndexedDbQuery<Source>
  }
>() {}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Tables extends IndexedDbTable.IndexedDbTable.Any>(options: {
  readonly tables: HashMap.HashMap<string, Tables>
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
  Tables extends ReadonlyArray<IndexedDbTable.IndexedDbTable.Any>
>(
  ...tables: Tables & { 0: IndexedDbTable.IndexedDbTable.Any }
): IndexedDbVersion<Tables[number]> => {
  return makeProto({
    tables: HashMap.fromIterable(
      tables.map((table) => [table.tableName, table])
    )
  })
}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function*() {
    const { IDBKeyRange, database } = yield* IndexedDbDatabase.IndexedDbDatabase
    return IndexedDbApi.of({
      makeApi: (source) => internal.makeProto({ database, IDBKeyRange, source, transaction: undefined }),
      use: (f) =>
        Effect.tryPromise({
          try: () => f(database),
          catch: (error) =>
            new internal.IndexedDbQueryError({
              reason: "UnknownError",
              cause: error
            })
        })
    })
  })
)
