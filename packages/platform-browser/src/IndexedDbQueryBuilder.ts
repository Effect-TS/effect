/**
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as Schema from "effect/Schema"
import type * as IndexedDbDatabase from "./IndexedDbDatabase.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Source extends IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  tables,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQueryBuilder<Source> => {
  const self: any = {
    tables,
    database,
    IDBKeyRange
  }

  self.use = <A>(f: (database: globalThis.IDBDatabase) => Promise<A>) =>
    Effect.tryPromise({
      try: () => f(database),
      catch: (error) =>
        new IndexedDbQueryError({
          reason: "UnknownError",
          cause: error
        })
    })

  self.from = <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(table: A) => fromMakeProto({ database, IDBKeyRange, tables, table, transaction })

  self.clearAll = applyClearAll({ database, transaction })

  self.transaction = Effect.fnUntraced(function*(
    transactionTables: Array<IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>>,
    mode: globalThis.IDBTransactionMode,
    callback: (api: {
      readonly from: <
        A extends IndexedDbTable.TableName<
          IndexedDbVersion.Tables<Source>
        >
      >(table: A) => IndexedDbQuery.From<Source, A>
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) {
    const transaction = database.transaction(transactionTables, mode, options)
    return yield* callback({
      from: (table) => fromMakeProto({ database, IDBKeyRange, tables, table, transaction })
    })
  })

  return self
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform-browser/IndexedDbQueryBuilder/Error")

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorReason =
  | "NotFoundError"
  | "UnknownError"
  | "DecodeError"
  | "TransactionError"

/**
 * @since 1.0.0
 * @category errors
 */
export class IndexedDbQueryError extends Data.TaggedError("IndexedDbQueryError")<{
  reason: ErrorReason
  cause: unknown
}> {
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export interface IndexedDbQueryBuilder<
  Source extends IndexedDbVersion.AnyWithProps = never
> {
  readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
  readonly database: globalThis.IDBDatabase

  readonly use: <A>(
    f: (database: globalThis.IDBDatabase) => Promise<A>
  ) => Effect.Effect<A, IndexedDbQueryError>

  readonly from: <
    A extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    >
  >(table: A) => IndexedDbQuery.From<Source, A>

  readonly clearAll: Effect.Effect<void, IndexedDbQueryError>

  readonly transaction: <
    Tables extends ReadonlyArray<
      IndexedDbTable.TableName<
        IndexedDbVersion.Tables<Source>
      >
    >,
    Mode extends "readonly" | "readwrite" = "readonly"
  >(
    tables: Tables & {
      0: IndexedDbTable.TableName<
        IndexedDbVersion.Tables<Source>
      >
    },
    mode: Mode,
    callback: (api: {
      readonly from: <A extends Tables[number]>(
        table: A
      ) => Mode extends "readwrite" ? IndexedDbQuery.From<Source, A> :
        Omit<
          IndexedDbQuery.From<Source, A>,
          "insert" | "insertAll" | "upsert" | "upsertAll" | "clear" | "delete"
        >
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) => Effect.Effect<void>
}

/**
 * @since 1.0.0
 * @category models
 */
export type KeyPath<TableSchema extends Schema.Schema.AnyNoContext> =
  | IndexedDbValidKeys<TableSchema>
  | Array<IndexedDbValidKeys<TableSchema>>

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbQuery {
  /**
   * @since 1.0.0
   * @category models
   */
  export type SourceTableSchemaType<
    Source extends IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
  > = IsKeyPathMissing<Source, Table> extends false ? IndexedDbTable.AutoIncrement<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends true ?
        & /** keyPath when omitted becomes a `number` */ Omit<
          Schema.Schema.Type<
            IndexedDbVersion.SchemaWithName<Source, Table>
          >,
          IndexedDbTable.KeyPath<
            IndexedDbTable.WithName<
              IndexedDbVersion.Tables<Source>,
              Table
            >
          >
        >
        & {
          [
            K in IndexedDbTable.KeyPath<
              IndexedDbTable.WithName<
                IndexedDbVersion.Tables<Source>,
                Table
              >
            >
          ]:
            | Pick<
              Schema.Schema.Type<
                IndexedDbVersion.SchemaWithName<Source, Table>
              >,
              IndexedDbTable.KeyPath<
                IndexedDbTable.WithName<
                  IndexedDbVersion.Tables<Source>,
                  Table
                >
              >
            >[K]
            | number
        } :
    Schema.Schema.Type<
      IndexedDbVersion.SchemaWithName<Source, Table>
    > :
    Schema.Schema.Type<
      IndexedDbVersion.SchemaWithName<Source, Table>
    >

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExtractIndexType<
    Source extends IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
  > = [Index] extends [never] ? Schema.Schema.Type<
      IndexedDbTable.TableSchema<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >[
      IndexedDbTable.KeyPath<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    ]
    : Schema.Schema.Type<
      IndexedDbTable.TableSchema<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >[
      IndexedDbTable.Indexes<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >[Index]
    ]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ModifyWithKey<
    Source extends IndexedDbVersion.AnyWithProps,
    Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
  > = IsKeyPathMissing<Source, Table> extends true ? IndexedDbTable.AutoIncrement<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends false ? /** keyPath: null, autoIncrement: false */
        & SourceTableSchemaType<Source, Table>
        & { readonly key: globalThis.IDBValidKey } :
    /** keyPath: null, autoIncrement: true */
    SourceTableSchemaType<Source, Table> & { readonly key?: globalThis.IDBValidKey } :
    IndexedDbTable.AutoIncrement<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    > extends false ? /** keyPath: string, autoIncrement: false */ SourceTableSchemaType<Source, Table> :
    & /** keyPath: string, autoIncrement: true */ Omit<
      SourceTableSchemaType<Source, Table>,
      IndexedDbTable.KeyPath<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >
    & {
      [
        K in IndexedDbTable.KeyPath<
          IndexedDbTable.WithName<
            IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      ]?: Pick<
        Schema.Schema.Type<
          IndexedDbVersion.SchemaWithName<Source, Table>
        >,
        IndexedDbTable.KeyPath<
          IndexedDbTable.WithName<
            IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      >[K]
    }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface From<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never
  > {
    readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
    readonly table: Table
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange
    readonly transaction?: globalThis.IDBTransaction

    readonly clear: Effect.Effect<void, IndexedDbQueryError>

    readonly select: {
      <Index extends IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Select<Source, Table, Index>
      (): Select<Source, Table, never>
    }

    readonly count: {
      <Index extends IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Count<Source, Table, Index>
      (): Count<Source, Table, never>
    }

    readonly delete: {
      <Index extends IndexedDbDatabase.IndexFromTable<Source, Table>>(
        index: Index
      ): Delete<Source, Table, Index>
      (): Delete<Source, Table, never>
    }

    readonly insert: (value: ModifyWithKey<Source, Table>) => Modify<Source, Table>
    readonly insertAll: (values: Array<ModifyWithKey<Source, Table>>) => ModifyAll<Source, Table>
    readonly upsert: (value: ModifyWithKey<Source, Table>) => Modify<Source, Table>
    readonly upsertAll: (values: Array<ModifyWithKey<Source, Table>>) => ModifyAll<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Clear<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never
  > extends Effect.Effect<void, IndexedDbQueryError> {
    readonly from: From<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Count<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > extends Effect.Effect<number, IndexedDbQueryError> {
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Count<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DeletePartial<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > {
    readonly from: From<Source, Table>
    readonly index?: Index

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Delete<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > extends Effect.Effect<void, IndexedDbQueryError> {
    readonly delete: DeletePartial<Source, Table, Index>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Select<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > extends Effect.Effect<Array<SourceTableSchemaType<Source, Table>>, IndexedDbQueryError> {
    readonly from: From<Source, Table>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Source, Table, Index>
    readonly lowerBound?: ExtractIndexType<Source, Table, Index>
    readonly upperBound?: ExtractIndexType<Source, Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Source, Table, Index>
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Source, Table, Index>,
      upperBound: ExtractIndexType<Source, Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Select<Source, Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between" | "first">

    readonly first: () => First<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface First<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table> = never
  > extends Effect.Effect<SourceTableSchemaType<Source, Table>, IndexedDbQueryError> {
    readonly select: Select<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Modify<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never
  > extends Effect.Effect<globalThis.IDBValidKey, IndexedDbQueryError> {
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly value: ModifyWithKey<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ModifyAll<
    Source extends IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.TableName<
      IndexedDbVersion.Tables<Source>
    > = never
  > extends Effect.Effect<Array<globalThis.IDBValidKey>, IndexedDbQueryError> {
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly values: Array<ModifyWithKey<Source, Table>>
  }
}

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

type IsValidIndexedDbKeyType<T> = T extends number | string | Date | ArrayBuffer | ArrayBufferView ? true :
  T extends Array<infer U> ? IsValidIndexedDbKeyType<U>
  : false

type IndexedDbValidKeys<TableSchema extends Schema.Schema.AnyNoContext> = {
  [K in keyof Schema.Schema.Encoded<TableSchema>]: K extends string
    ? IsValidIndexedDbKeyType<Schema.Schema.Encoded<TableSchema>[K]> extends true ? K
    : never
    : never
}[keyof Schema.Schema.Encoded<TableSchema>]

type IsKeyPathMissing<
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
> = [
  IndexedDbTable.KeyPath<
    IndexedDbTable.WithName<
      IndexedDbVersion.Tables<Source>,
      Table
    >
  >
] extends [never] ? true : false

const applyDelete = (query: IndexedDbQuery.Delete) =>
  Effect.async<any, IndexedDbQueryError>((resume) => {
    const database = query.delete.from.database
    const IDBKeyRange = query.delete.from.IDBKeyRange
    const transaction = query.delete.from.transaction
    const objectStore = (transaction ?? database.transaction([query.delete.from.table], "readwrite")).objectStore(
      query.delete.from.table
    )

    let keyRange: globalThis.IDBKeyRange | undefined = undefined

    if (query.only !== undefined) {
      keyRange = IDBKeyRange.only(query.only)
    } else if (query.lowerBound !== undefined && query.upperBound !== undefined) {
      keyRange = IDBKeyRange.bound(
        query.lowerBound,
        query.upperBound,
        query.excludeLowerBound,
        query.excludeUpperBound
      )
    } else if (query.lowerBound !== undefined) {
      keyRange = IDBKeyRange.lowerBound(query.lowerBound, query.excludeLowerBound)
    } else if (query.upperBound !== undefined) {
      keyRange = IDBKeyRange.upperBound(query.upperBound, query.excludeUpperBound)
    }

    let request: globalThis.IDBRequest

    if (query.limitValue !== undefined) {
      const cursorRequest = objectStore.openCursor()
      let count = 0

      cursorRequest.onerror = () => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({ reason: "TransactionError", cause: cursorRequest.error })
          )
        )
      }

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor !== null) {
          const deleteRequest = cursor.delete()

          deleteRequest.onerror = () => {
            resume(
              Effect.fail(
                new IndexedDbQueryError({ reason: "TransactionError", cause: deleteRequest.error })
              )
            )
          }

          count += 1
          if (count > query.limitValue!) {
            cursor.continue()
          }
        }

        resume(Effect.void)
      }
    } else if (keyRange !== undefined) {
      request = objectStore.delete(keyRange)

      request.onerror = (event) => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: event
            })
          )
        )
      }

      request.onsuccess = () => {
        resume(Effect.succeed(request.result))
      }
    } else {
      resume(Effect.dieMessage("No key range provided for delete operation"))
    }
  })

const getReadonlyObjectStore = (
  query: IndexedDbQuery.Select | IndexedDbQuery.Count
) => {
  const database = query.from.database
  const IDBKeyRange = query.from.IDBKeyRange
  const transaction = query.from.transaction
  const objectStore = (transaction ?? database.transaction([query.from.table], "readonly")).objectStore(
    query.from.table
  )

  let keyRange: globalThis.IDBKeyRange | undefined = undefined
  let store: globalThis.IDBObjectStore | globalThis.IDBIndex

  if (query.only !== undefined) {
    keyRange = IDBKeyRange.only(query.only)
  } else if (query.lowerBound !== undefined && query.upperBound !== undefined) {
    keyRange = IDBKeyRange.bound(
      query.lowerBound,
      query.upperBound,
      query.excludeLowerBound,
      query.excludeUpperBound
    )
  } else if (query.lowerBound !== undefined) {
    keyRange = IDBKeyRange.lowerBound(query.lowerBound, query.excludeLowerBound)
  } else if (query.upperBound !== undefined) {
    keyRange = IDBKeyRange.upperBound(query.upperBound, query.excludeUpperBound)
  }

  if (query.index !== undefined) {
    store = objectStore.index(query.index)
  } else {
    store = objectStore
  }

  return { store, keyRange }
}

const getReadSchema = (
  from: IndexedDbQuery.From
) => {
  const table = from.tables.get(from.table as any)! as IndexedDbTable.AnyWithProps
  const keyPath = table.options?.keyPath
  const autoIncrement = table.options?.autoIncrement

  return keyPath !== undefined && autoIncrement ?
    table.tableSchema.pipe(
      Schema.omit(keyPath),
      Schema.extend(Schema.Struct({
        [keyPath]: Schema.Union(
          Schema.Number,
          // @ts-expect-error
          table.tableSchema.fields[keyPath]
        )
      }))
    ) :
    table.tableSchema
}

const getSelect = Effect.fnUntraced(function*(query: IndexedDbQuery.Select) {
  const data = yield* Effect.async<any, IndexedDbQueryError>((resume) => {
    let request: globalThis.IDBRequest
    const { keyRange, store } = getReadonlyObjectStore(query)

    if (query.limitValue !== undefined) {
      const cursorRequest = store.openCursor(keyRange)
      const results: Array<any> = []
      let count = 0

      cursorRequest.onerror = () => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({ reason: "TransactionError", cause: cursorRequest.error })
          )
        )
      }

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (cursor !== null) {
          results.push(cursor.value)
          count += 1
          if (count < query.limitValue!) {
            cursor.continue()
          } else {
            resume(Effect.succeed(results))
          }
        } else {
          resume(Effect.succeed(results))
        }
      }
    } else {
      request = store.getAll(keyRange)

      request.onerror = (event) => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: event
            })
          )
        )
      }

      request.onsuccess = () => {
        resume(Effect.succeed(request.result))
      }
    }
  })

  const tableSchema = Schema.Array(
    getReadSchema(query.from)
  )

  return yield* Schema.decodeUnknown(tableSchema)(data).pipe(
    Effect.mapError(
      (error) =>
        new IndexedDbQueryError({
          reason: "DecodeError",
          cause: error
        })
    )
  )
})

const getFirst = Effect.fnUntraced(function*(query: IndexedDbQuery.First) {
  const data = yield* Effect.async<any, IndexedDbQueryError>((resume) => {
    const { keyRange, store } = getReadonlyObjectStore(query.select)

    if (keyRange !== undefined) {
      const request = store.get(keyRange)

      request.onerror = (event) => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: event
            })
          )
        )
      }

      request.onsuccess = () => {
        resume(Effect.succeed(request.result))
      }
    } else {
      const request = store.openCursor()

      request.onerror = (event) => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: event
            })
          )
        )
      }

      request.onsuccess = () => {
        const value = request.result?.value

        if (value === undefined) {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "NotFoundError",
                cause: request.error
              })
            )
          )
        } else {
          resume(Effect.succeed(request.result?.value))
        }
      }
    }
  })

  return yield* Schema.decodeUnknown(getReadSchema(query.select.from))(data).pipe(
    Effect.mapError(
      (error) =>
        new IndexedDbQueryError({
          reason: "DecodeError",
          cause: error
        })
    )
  )
})

const applyModify = (
  query: IndexedDbQuery.Modify,
  { key, ...value }: { key: IDBValidKey | undefined }
) =>
  Effect.async<any, IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const transaction = query.from.transaction
    const objectStore = (transaction ?? database.transaction([query.from.table], "readwrite")).objectStore(
      query.from.table
    )

    let request: globalThis.IDBRequest<IDBValidKey>

    if (query.operation === "add") {
      request = objectStore.add(value, key)
    } else if (query.operation === "put") {
      request = objectStore.put(value, key)
    } else {
      return resume(Effect.dieMessage("Invalid modify operation"))
    }

    request.onerror = (event) => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({
            reason: "TransactionError",
            cause: event
          })
        )
      )
    }

    request.onsuccess = () => {
      resume(Effect.succeed(request.result))
    }
  })

const applyModifyAll = (query: IndexedDbQuery.ModifyAll, values: Array<any>) =>
  Effect.async<Array<globalThis.IDBValidKey>, IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const transaction = query.from.transaction
    const objectStore = (transaction ?? database.transaction([query.from.table], "readwrite")).objectStore(
      query.from.table
    )

    const results: Array<globalThis.IDBValidKey> = []

    if (query.operation === "add") {
      for (let i = 0; i < values.length; i++) {
        const request = objectStore.add(values[i])

        request.onerror = () => {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "TransactionError",
                cause: request.error
              })
            )
          )
        }

        request.onsuccess = () => {
          results.push(request.result)
        }
      }
    } else if (query.operation === "put") {
      for (let i = 0; i < values.length; i++) {
        const request = objectStore.put(values[i])

        request.onerror = () => {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "TransactionError",
                cause: request.error
              })
            )
          )
        }

        request.onsuccess = () => {
          results.push(request.result)
        }
      }
    } else {
      return resume(Effect.dieMessage("Invalid modify all operation"))
    }

    objectStore.transaction.onerror = () => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({
            reason: "TransactionError",
            cause: objectStore.transaction.error
          })
        )
      )
    }

    objectStore.transaction.oncomplete = () => {
      resume(Effect.succeed(results))
    }
  })

const applyClear = (options: {
  readonly database: globalThis.IDBDatabase
  readonly transaction: globalThis.IDBTransaction | undefined
  readonly table: string
}) =>
  Effect.async<void, IndexedDbQueryError>((resume) => {
    const database = options.database
    const transaction = options.transaction
    const objectStore = (transaction ?? database.transaction([options.table], "readwrite")).objectStore(
      options.table
    )

    const request = objectStore.clear()

    request.onerror = (event) => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({
            reason: "TransactionError",
            cause: event
          })
        )
      )
    }

    request.onsuccess = () => {
      resume(Effect.void)
    }
  })

const applyClearAll = (options: {
  readonly database: globalThis.IDBDatabase
  readonly transaction: globalThis.IDBTransaction | undefined
}) =>
  Effect.async<void, IndexedDbQueryError>((resume) => {
    const database = options.database
    const tables = database.objectStoreNames

    const transaction = options.transaction ?? database.transaction(tables, "readwrite")

    for (let t = 0; t < tables.length; t++) {
      const objectStore = transaction.objectStore(tables[t])
      const request = objectStore.clear()

      request.onerror = () => {
        resume(
          Effect.fail(
            new IndexedDbQueryError({
              reason: "TransactionError",
              cause: request.error
            })
          )
        )
      }
    }

    transaction.onerror = () => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({
            reason: "TransactionError",
            cause: transaction.error
          })
        )
      )
    }

    transaction.oncomplete = () => {
      resume(Effect.void)
    }
  })

const getCount = (query: IndexedDbQuery.Count) =>
  Effect.async<number, IndexedDbQueryError>((resume) => {
    const { keyRange, store } = getReadonlyObjectStore(query)

    const request = store.count(keyRange)

    request.onerror = (event) => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({
            reason: "TransactionError",
            cause: event
          })
        )
      )
    }

    request.onsuccess = () => {
      resume(Effect.succeed(request.result))
    }
  })

const fromMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
>(options: {
  readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
  readonly table: Table
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQuery.From<Source, Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.tables = options.tables
  self.table = options.table
  self.database = options.database
  self.IDBKeyRange = options.IDBKeyRange
  self.transaction = options.transaction
  self.select = <
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
  >(index?: Index) =>
    selectMakeProto({
      from: self,
      // @ts-expect-error
      index
    })

  self.delete = <
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
  >(index?: Index) =>
    deletePartialMakeProto({
      from: self,
      // @ts-expect-error
      index
    })

  self.count = <
    Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
  >(index?: Index) =>
    countMakeProto({
      from: self,
      // @ts-expect-error
      index
    })

  self.insert = (value: any) => modifyMakeProto({ from: self, value, operation: "add" })

  self.upsert = (value: any) => modifyMakeProto({ from: self, value, operation: "put" })

  self.insertAll = (values: Array<any>) => modifyAllMakeProto({ from: self, values, operation: "add" })

  self.upsertAll = (values: Array<any>) => modifyAllMakeProto({ from: self, values, operation: "put" })

  self.clear = applyClear({
    database: options.database,
    transaction: options.transaction,
    table: options.table
  })

  return self
}

const deletePartialMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
}): IndexedDbQuery.DeletePartial<Source, Table, Index> => {
  const self: any = {}

  const limit = (
    limit: number
  ): IndexedDbQuery.Delete<Source, Table, Index> => deleteMakeProto({ delete: self as any, limitValue: limit })

  const equals = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> => deleteMakeProto({ delete: self as any, only: value })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      lowerBound: value,
      excludeLowerBound: false
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      upperBound: value,
      excludeUpperBound: false
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      lowerBound: value,
      excludeLowerBound: true
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      upperBound: value,
      excludeUpperBound: true
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false
    })

  self.from = options.from
  self.index = options.index
  self.equals = equals
  self.gte = gte
  self.lte = lte
  self.gt = gt
  self.lt = lt
  self.between = between
  self.limit = limit
  return self as any
}

const deleteMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
>(options: {
  readonly delete: IndexedDbQuery.DeletePartial<Source, Table, Index>
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Delete<Source, Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      only: options.only,
      lowerBound: options.lowerBound,
      upperBound: options.upperBound,
      excludeLowerBound: options.excludeLowerBound ?? false,
      excludeUpperBound: options.excludeUpperBound ?? false,
      limitValue: limit
    })

  const equals = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: options.delete, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  self.commit = function(this: IndexedDbQuery.Delete) {
    return applyDelete(this)
  }
  self.delete = options.delete
  self.limitValue = options.limitValue
  self.only = options.only
  self.lowerBound = options.lowerBound
  self.upperBound = options.upperBound
  self.excludeLowerBound = options.excludeLowerBound
  self.excludeUpperBound = options.excludeUpperBound
  self.equals = equals
  self.gte = gte
  self.lte = lte
  self.gt = gt
  self.lt = lt
  self.between = between
  self.limit = limit
  return self
}

const countMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Count<Source, Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      only: options.only,
      lowerBound: options.lowerBound,
      upperBound: options.upperBound,
      excludeLowerBound: options.excludeLowerBound ?? false,
      excludeUpperBound: options.excludeUpperBound ?? false,
      limitValue: limit
    })

  const equals = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  self.commit = function(this: IndexedDbQuery.Count) {
    return getCount(this)
  }
  self.from = options.from
  self.index = options.index
  self.only = options.only
  self.limitValue = options.limitValue
  self.lowerBound = options.lowerBound
  self.upperBound = options.upperBound
  self.excludeLowerBound = options.excludeLowerBound
  self.excludeUpperBound = options.excludeUpperBound
  self.equals = equals
  self.gte = gte
  self.lte = lte
  self.gt = gt
  self.lt = lt
  self.between = between
  self.limit = limit
  return self
}

const selectMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Select<Source, Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      only: options.only,
      lowerBound: options.lowerBound,
      upperBound: options.upperBound,
      excludeLowerBound: options.excludeLowerBound ?? false,
      excludeUpperBound: options.excludeUpperBound ?? false,
      limitValue: limit
    })

  const equals = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  const first = (): IndexedDbQuery.First<Source, Table, Index> => firstMakeProto({ select: self as any })

  self.commit = function(this: IndexedDbQuery.Select) {
    return getSelect(this)
  }
  self.from = options.from
  self.index = options.index
  self.only = options.only
  self.limitValue = options.limitValue
  self.lowerBound = options.lowerBound
  self.upperBound = options.upperBound
  self.excludeLowerBound = options.excludeLowerBound
  self.excludeUpperBound = options.excludeUpperBound
  self.equals = equals
  self.gte = gte
  self.lte = lte
  self.gt = gt
  self.lt = lt
  self.between = between
  self.limit = limit
  self.first = first
  return self as any
}

const firstMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbDatabase.IndexFromTable<Source, Table>
>(options: {
  readonly select: IndexedDbQuery.Select<Source, Table, Index>
}): IndexedDbQuery.First<Source, Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.First) {
    return getFirst(this)
  }
  self.select = options.select
  return self as any
}

const modifyMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQuery.From<Source, Table>
  readonly value: Schema.Schema.Type<
    IndexedDbTable.TableSchema<
      IndexedDbTable.WithName<
        IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >
  readonly operation: "add" | "put"
}): IndexedDbQuery.Modify<Source, Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.Modify) {
    return applyModify(this, { key: undefined, ...options.value })
  }
  self.from = options.from
  self.value = options.value
  self.operation = options.operation
  return self as any
}

const modifyAllMakeProto = <
  Source extends IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQuery.From<Source, Table>
  readonly values: Array<
    Schema.Schema.Type<
      IndexedDbTable.TableSchema<
        IndexedDbTable.WithName<
          IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >
  >
  readonly operation: "add" | "put"
}): IndexedDbQuery.Modify<Source, Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.ModifyAll) {
    return applyModifyAll(this, options.values)
  }
  self.from = options.from
  self.values = options.values
  self.operation = options.operation
  return self as any
}
