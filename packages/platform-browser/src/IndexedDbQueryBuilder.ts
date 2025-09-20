/**
 * @since 1.0.0
 */
import type { NonEmptyReadonlyArray } from "effect/Array"
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
  >(table: A) => fromMakeProto({ database, IDBKeyRange, table: tables.get(table)!, transaction })

  self.clearAll = applyClearAll({ database, transaction })

  self.transaction = Effect.fnUntraced(function*<E, R>(
    transactionTables: Array<IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>>,
    mode: globalThis.IDBTransactionMode,
    callback: (api: {
      readonly from: <
        Name extends IndexedDbTable.TableName<
          IndexedDbVersion.Tables<Source>
        >
      >(table: Name) => IndexedDbQuery.From<IndexedDbVersion.TableWithName<Source, Name>>
    }) => Effect.Effect<void, E, R>,
    options?: globalThis.IDBTransactionOptions
  ) {
    const transaction = database.transaction(transactionTables, mode, options)
    return yield* callback({
      from: (table) => fromMakeProto({ database, IDBKeyRange, table: tables.get(table) as any, transaction })
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
  | "EncodeError"
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
  Source extends IndexedDbVersion.AnyWithProps
> {
  readonly tables: ReadonlyMap<string, IndexedDbVersion.Tables<Source>>
  readonly database: globalThis.IDBDatabase

  readonly use: <A = unknown>(
    f: (database: globalThis.IDBDatabase) => Promise<A>
  ) => Effect.Effect<A, IndexedDbQueryError>

  readonly from: <
    const Name extends IndexedDbTable.TableName<IndexedDbVersion.Tables<Source>>
  >(table: Name) => IndexedDbQuery.From<IndexedDbVersion.TableWithName<Source, Name>>

  readonly clearAll: Effect.Effect<void, IndexedDbQueryError>

  readonly transaction: <
    Tables extends NonEmptyReadonlyArray<
      IndexedDbTable.TableName<
        IndexedDbVersion.Tables<Source>
      >
    >,
    Mode extends "readonly" | "readwrite",
    E,
    R
  >(
    tables: Tables,
    mode: Mode,
    callback: (api: {
      readonly from: <Name extends Tables[number]>(
        table: Name
      ) => Mode extends "readwrite" ? IndexedDbQuery.From<IndexedDbVersion.TableWithName<Source, Name>> :
        Omit<
          IndexedDbQuery.From<IndexedDbVersion.TableWithName<Source, Name>>,
          "insert" | "insertAll" | "upsert" | "upsertAll" | "clear" | "delete"
        >
    }) => Effect.Effect<void, E, R>,
    options?: globalThis.IDBTransactionOptions
  ) => Effect.Effect<void, never, R>
}

/**
 * @since 1.0.0
 * @category models
 */
export type KeyPath<TableSchema extends IndexedDbTable.AnySchemaStruct> =
  | IndexedDbValidKeys<TableSchema>
  | Array<IndexedDbValidKeys<TableSchema>>

/**
 * @since 1.0.0
 * @category models
 */
export type KeyPathNumber<TableSchema extends IndexedDbTable.AnySchemaStruct> =
  | IndexedDbValidNumberKeys<TableSchema>
  | Array<IndexedDbValidNumberKeys<TableSchema>>

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
    Table extends IndexedDbTable.AnyWithProps
  > = IndexedDbTable.TableSchema<Table>["Type"]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExtractIndexType<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > = [Index] extends [never] ? Schema.Schema.Type<
      IndexedDbTable.TableSchema<Table>
    >[
      IndexedDbTable.KeyPath<Table>
    ]
    : Schema.Schema.Type<IndexedDbTable.TableSchema<Table>>[
      IndexedDbTable.Indexes<Table>[Index]
    ]

  /**
   * @since 1.0.0
   * @category models
   */
  export type ModifyWithKey<Table extends IndexedDbTable.AnyWithProps> = SourceTableSchemaType<Table>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface From<Table extends IndexedDbTable.AnyWithProps> {
    readonly table: Table
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange
    readonly transaction?: globalThis.IDBTransaction

    readonly clear: Effect.Effect<void, IndexedDbQueryError>

    readonly select: {
      <Index extends IndexedDbDatabase.IndexFromTable<Table>>(
        index: Index
      ): Select<Table, Index>
      (): Select<Table, never>
    }

    readonly count: {
      <Index extends IndexedDbDatabase.IndexFromTable<Table>>(
        index: Index
      ): Count<Table, Index>
      (): Count<Table, never>
    }

    readonly delete: {
      <Index extends IndexedDbDatabase.IndexFromTable<Table>>(
        index: Index
      ): Delete<Table, Index>
      (): Delete<Table, never>
    }

    readonly insert: (value: ModifyWithKey<Table>) => Modify<Table>
    readonly insertAll: (values: Array<ModifyWithKey<Table>>) => ModifyAll<Table>
    readonly upsert: (value: ModifyWithKey<Table>) => Modify<Table>
    readonly upsertAll: (values: Array<ModifyWithKey<Table>>) => ModifyAll<Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Clear<Table extends IndexedDbTable.AnyWithProps> extends Effect.Effect<void, IndexedDbQueryError> {
    readonly from: From<Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Count<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > extends Effect.Effect<number, IndexedDbQueryError> {
    readonly from: From<Table>
    readonly index?: Index
    readonly only?: ExtractIndexType<Table, Index>
    readonly lowerBound?: ExtractIndexType<Table, Index>
    readonly upperBound?: ExtractIndexType<Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Table, Index>,
      upperBound: ExtractIndexType<Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Count<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DeletePartial<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > {
    readonly from: From<Table>
    readonly index?: Index

    readonly equals: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Table, Index>,
      upperBound: ExtractIndexType<Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Delete<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > extends Effect.Effect<void, IndexedDbQueryError> {
    readonly delete: DeletePartial<Table, Index>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Table, Index>
    readonly lowerBound?: ExtractIndexType<Table, Index>
    readonly upperBound?: ExtractIndexType<Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Table, Index>,
      upperBound: ExtractIndexType<Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Delete<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Delete<Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Select<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > extends Effect.Effect<Array<SourceTableSchemaType<Table>>, IndexedDbQueryError, IndexedDbTable.Context<Table>> {
    readonly from: From<Table>
    readonly index?: Index
    readonly limitValue?: number
    readonly only?: ExtractIndexType<Table, Index>
    readonly lowerBound?: ExtractIndexType<Table, Index>
    readonly upperBound?: ExtractIndexType<Table, Index>
    readonly excludeLowerBound?: boolean
    readonly excludeUpperBound?: boolean

    readonly equals: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lte: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly lt: (
      value: ExtractIndexType<Table, Index>
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly between: (
      lowerBound: ExtractIndexType<Table, Index>,
      upperBound: ExtractIndexType<Table, Index>,
      options?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
    ) => Omit<Select<Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly limit: (
      limit: number
    ) => Omit<Select<Table, Index>, "limit" | "equals" | "gte" | "lte" | "gt" | "lt" | "between" | "first">

    readonly first: () => First<Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface First<
    Table extends IndexedDbTable.AnyWithProps,
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  > extends Effect.Effect<SourceTableSchemaType<Table>, IndexedDbQueryError, IndexedDbTable.Context<Table>> {
    readonly select: Select<Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Modify<
    Table extends IndexedDbTable.AnyWithProps
  > extends Effect.Effect<globalThis.IDBValidKey, IndexedDbQueryError, IndexedDbTable.Context<Table>> {
    readonly operation: "add" | "put"
    readonly from: From<Table>
    readonly value: ModifyWithKey<Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ModifyAll<
    Table extends IndexedDbTable.AnyWithProps
  > extends Effect.Effect<Array<globalThis.IDBValidKey>, IndexedDbQueryError, IndexedDbTable.Context<Table>> {
    readonly operation: "add" | "put"
    readonly from: From<Table>
    readonly values: Array<ModifyWithKey<Table>>
  }
}

// -----------------------------------------------------------------------------
// internal
// -----------------------------------------------------------------------------

type IndexedDbValidKeys<TableSchema extends IndexedDbTable.AnySchemaStruct> = keyof TableSchema["Encoded"] extends
  infer K ? K extends keyof TableSchema["Encoded"] ? TableSchema["Encoded"][K] extends Readonly<IDBValidKey> ? K : never
  : never
  : never

type IndexedDbValidNumberKeys<TableSchema extends IndexedDbTable.AnySchemaStruct> = keyof TableSchema["Encoded"] extends
  infer K ?
  K extends keyof TableSchema["Encoded"] ? [TableSchema["Encoded"][K]] extends [number | undefined] ? K : never
  : never
  : never

const applyDelete = (query: IndexedDbQuery.Delete<any, never>) =>
  Effect.async<any, IndexedDbQueryError>((resume) => {
    const database = query.delete.from.database
    const IDBKeyRange = query.delete.from.IDBKeyRange
    const transaction = query.delete.from.transaction
    const objectStore = (transaction ?? database.transaction([query.delete.from.table.tableName], "readwrite"))
      .objectStore(
        query.delete.from.table.tableName
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
  query: IndexedDbQuery.Select<any, never> | IndexedDbQuery.Count<any, never>
) => {
  const database = query.from.database
  const IDBKeyRange = query.from.IDBKeyRange
  const transaction = query.from.transaction
  const objectStore = (transaction ?? database.transaction([query.from.table.tableName], "readonly")).objectStore(
    query.from.table.tableName
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
  from: IndexedDbQuery.From<any>
) => (from.table as IndexedDbTable.AnyWithProps).tableSchema

const getSelect = Effect.fnUntraced(function*(query: IndexedDbQuery.Select<any, never>) {
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

  const tableSchema = Schema.Array(getReadSchema(query.from))

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

const getFirst = Effect.fnUntraced(function*(query: IndexedDbQuery.First<any, never>) {
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

const applyModify = Effect.fnUntraced(function*({
  query,
  value
}: {
  query: IndexedDbQuery.Modify<any>
  value: any
}) {
  const encodedValue = yield* Schema.encodeUnknown(query.from.table.tableSchema)(value).pipe(
    Effect.mapError(
      (error) =>
        new IndexedDbQueryError({
          reason: "EncodeError",
          cause: error
        })
    )
  )

  return yield* Effect.async<any, IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const transaction = query.from.transaction
    const objectStore = (transaction ?? database.transaction([query.from.table.tableName], "readwrite")).objectStore(
      query.from.table.tableName
    )

    let request: globalThis.IDBRequest<IDBValidKey>

    if (query.operation === "add") {
      request = objectStore.add(encodedValue)
    } else if (query.operation === "put") {
      request = objectStore.put(encodedValue)
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
})

const applyModifyAll = (query: IndexedDbQuery.ModifyAll<any>, values: Array<any>) =>
  Effect.async<Array<globalThis.IDBValidKey>, IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const transaction = query.from.transaction
    const objectStore = (transaction ?? database.transaction([query.from.table.tableName], "readwrite")).objectStore(
      query.from.table.tableName
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

const getCount = (query: IndexedDbQuery.Count<any, never>) =>
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
  const Table extends IndexedDbTable.AnyWithProps
>(options: {
  readonly table: Table
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQuery.From<Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.table = options.table
  self.database = options.database
  self.IDBKeyRange = options.IDBKeyRange
  self.transaction = options.transaction
  self.select = <
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  >(index?: Index) =>
    selectMakeProto({
      from: self,
      // @ts-expect-error
      index
    })

  self.delete = <
    Index extends IndexedDbDatabase.IndexFromTable<Table>
  >(index?: Index) =>
    deletePartialMakeProto({
      from: self,
      // @ts-expect-error
      index
    })

  self.count = <
    Index extends IndexedDbDatabase.IndexFromTable<Table>
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
    table: options.table.tableName
  })

  return self
}

const deletePartialMakeProto = <
  Table extends IndexedDbTable.AnyWithProps,
  Index extends IndexedDbDatabase.IndexFromTable<Table>
>(options: {
  readonly from: IndexedDbQuery.From<Table>
  readonly index: Index | undefined
}): IndexedDbQuery.DeletePartial<Table, Index> => {
  const self: any = {}

  const limit = (
    limit: number
  ): IndexedDbQuery.Delete<Table, Index> => deleteMakeProto({ delete: self as any, limitValue: limit })

  const equals = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> => deleteMakeProto({ delete: self as any, only: value })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      lowerBound: value,
      excludeLowerBound: false
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      upperBound: value,
      excludeUpperBound: false
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      lowerBound: value,
      excludeLowerBound: true
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: self as any,
      upperBound: value,
      excludeUpperBound: true
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Delete<Table, Index> =>
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
  Table extends IndexedDbTable.AnyWithProps,
  Index extends IndexedDbDatabase.IndexFromTable<Table>
>(options: {
  readonly delete: IndexedDbQuery.DeletePartial<Table, Index>
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Delete<Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Delete<Table, Index> =>
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
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({ delete: options.delete, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Delete<Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  self.commit = function(this: IndexedDbQuery.Delete<any, never>) {
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
  Table extends IndexedDbTable.AnyWithProps,
  Index extends IndexedDbDatabase.IndexFromTable<Table>
>(options: {
  readonly from: IndexedDbQuery.From<Table>
  readonly index: Index | undefined
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Count<Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Count<Table, Index> =>
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
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Count<Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  self.commit = function(this: IndexedDbQuery.Count<any, never>) {
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
  Table extends IndexedDbTable.AnyWithProps,
  Index extends IndexedDbDatabase.IndexFromTable<Table>
>(options: {
  readonly from: IndexedDbQuery.From<Table>
  readonly index: Index | undefined
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly lowerBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly upperBound?: IndexedDbQuery.ExtractIndexType<Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQuery.Select<Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)

  const limit = (
    limit: number
  ): IndexedDbQuery.Select<Table, Index> =>
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
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQuery.ExtractIndexType<Table, Index>
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    upperBound: IndexedDbQuery.ExtractIndexType<Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQuery.Select<Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  const first = (): IndexedDbQuery.First<Table, Index> => firstMakeProto({ select: self as any })

  self.commit = function(this: IndexedDbQuery.Select<any, never>) {
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
  Table extends IndexedDbTable.AnyWithProps,
  Index extends IndexedDbDatabase.IndexFromTable<Table>
>(options: {
  readonly select: IndexedDbQuery.Select<Table, Index>
}): IndexedDbQuery.First<Table, Index> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.First<any, never>) {
    return getFirst(this)
  }
  self.select = options.select
  return self as any
}

const modifyMakeProto = <
  Table extends IndexedDbTable.AnyWithProps
>(options: {
  readonly from: IndexedDbQuery.From<Table>
  readonly value: IndexedDbTable.TableSchema<Table>["Type"]
  readonly operation: "add" | "put"
}): IndexedDbQuery.Modify<Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.Modify<any>) {
    return applyModify({ query: this, value: options.value })
  }
  self.from = options.from
  self.value = options.value
  self.operation = options.operation
  return self as any
}

const modifyAllMakeProto = <
  Table extends IndexedDbTable.AnyWithProps
>(options: {
  readonly from: IndexedDbQuery.From<Table>
  readonly values: Array<IndexedDbTable.TableSchema<Table>["Type"]>
  readonly operation: "add" | "put"
}): IndexedDbQuery.Modify<Table> => {
  const self = Object.create(Effectable.CommitPrototype)
  self.commit = function(this: IndexedDbQuery.ModifyAll<any>) {
    return applyModifyAll(this, options.values)
  }
  self.from = options.from
  self.values = options.values
  self.operation = options.operation
  return self as any
}
