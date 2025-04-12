/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as HashMap from "effect/HashMap"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as IndexedDbMigration from "./IndexedDbMigration.js"
import * as IndexedDbQuery from "./IndexedDbQuery.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

/**
 * TODO:
 * - `insertAll`
 * - `updateAll`
 * - `clear`
 * - `count`
 * - Include `Scope` but make it "optional"
 *
 * LATER:
 * - Transactions
 * - `modify` (first read, then give function to modify)
 */

type IsNever<T> = [T] extends [never] ? true : false

type ExtractIndexType<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
> = IsNever<Index> extends true ? Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >[
    IndexedDbTable.IndexedDbTable.KeyPath<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  ]
  : Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >[
    IndexedDbTable.IndexedDbTable.Indexes<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >[Index]
  ]

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbQueryBuilder"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbQueryBuilder {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface From<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly source: Source
    readonly table: Table
    readonly database: globalThis.IDBDatabase
    readonly IDBKeyRange: typeof globalThis.IDBKeyRange

    readonly select: {
      <Index extends IndexedDbMigration.IndexFromTable<Source, Table>>(index: Index): Select<Source, Table, Index>
      (): Select<Source, Table, never>
    }

    readonly delete: <
      Index extends IndexedDbMigration.IndexFromTable<Source, Table>
    >(index?: Index) => DeletePartial<Source, Table, Index>

    readonly insert: (
      value: Schema.Schema.Type<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      >
    ) => Modify<Source, Table>

    readonly upsert: (
      value: Schema.Schema.Type<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            Table
          >
        >
      >
    ) => Modify<Source, Table>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface DeletePartial<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
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
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<void>>

    readonly [TypeId]: TypeId
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
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<
      Effect.Effect<
        Array<
          Schema.Schema.Type<
            IndexedDbTable.IndexedDbTable.TableSchema<
              IndexedDbTable.IndexedDbTable.WithName<
                IndexedDbVersion.IndexedDbVersion.Tables<Source>,
                Table
              >
            >
          >
        >
      >
    >

    readonly [TypeId]: TypeId
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
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<
      Effect.Effect<
        Schema.Schema.Type<
          IndexedDbTable.IndexedDbTable.TableSchema<
            IndexedDbTable.IndexedDbTable.WithName<
              IndexedDbVersion.IndexedDbVersion.Tables<Source>,
              Table
            >
          >
        >
      >
    >

    readonly [TypeId]: TypeId
    readonly select: Select<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Modify<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never
  > extends Pipeable {
    new(_: never): {}

    [Symbol.iterator](): Effect.EffectGenerator<Effect.Effect<globalThis.IDBValidKey>>

    readonly [TypeId]: TypeId
    readonly operation: "add" | "put"
    readonly from: From<Source, Table>
    readonly value: Schema.Schema.Type<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >
  }
}

const applyDelete = (query: IndexedDbQueryBuilder.Delete) =>
  Effect.async<any, IndexedDbQuery.IndexedDbQueryError>((resume) => {
    const database = query.delete.from.database
    const IDBKeyRange = query.delete.from.IDBKeyRange
    const objectStore = database.transaction([query.delete.from.table], "readwrite").objectStore(
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
            new IndexedDbQuery.IndexedDbQueryError({ reason: "TransactionError", cause: cursorRequest.error })
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
                new IndexedDbQuery.IndexedDbQueryError({ reason: "TransactionError", cause: deleteRequest.error })
              )
            )
          }

          count += 1
          if (count >= query.limitValue!) {
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
            new IndexedDbQuery.IndexedDbQueryError({
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

const getReadonlyObjectStore = (query: IndexedDbQueryBuilder.Select) => {
  const database = query.from.database
  const IDBKeyRange = query.from.IDBKeyRange
  const objectStore = database.transaction([query.from.table], "readonly").objectStore(query.from.table)

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

const getSelect = (query: IndexedDbQueryBuilder.Select) =>
  Effect.gen(function*() {
    const data = yield* Effect.async<any, IndexedDbQuery.IndexedDbQueryError>((resume) => {
      let request: globalThis.IDBRequest
      const { keyRange, store } = getReadonlyObjectStore(query)

      if (query.limitValue !== undefined) {
        const cursorRequest = store.openCursor()
        const results: Array<any> = []
        let count = 0

        cursorRequest.onerror = () => {
          resume(
            Effect.fail(
              new IndexedDbQuery.IndexedDbQueryError({ reason: "TransactionError", cause: cursorRequest.error })
            )
          )
        }

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result
          if (cursor !== null) {
            results.push(cursor.value)
            count += 1
            if (count >= query.limitValue!) {
              cursor.continue()
            }
          }

          resume(Effect.succeed(results))
        }
      } else {
        request = store.getAll(keyRange)

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbQuery.IndexedDbQueryError({
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
      // @ts-expect-error
      query.from.source.tables.pipe(HashMap.unsafeGet(query.from.table), (_) => _.tableSchema)
    )

    return yield* Schema.decodeUnknown(tableSchema)(data).pipe(
      Effect.mapError(
        (error) =>
          new IndexedDbQuery.IndexedDbQueryError({
            reason: "DecodeError",
            cause: error
          })
      )
    )
  })

const getFirst = (query: IndexedDbQueryBuilder.First) =>
  Effect.gen(function*() {
    const data = yield* Effect.async<any, IndexedDbQuery.IndexedDbQueryError>((resume) => {
      const { keyRange, store } = getReadonlyObjectStore(query.select)

      if (keyRange !== undefined) {
        const request = store.get(keyRange)

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbQuery.IndexedDbQueryError({
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
              new IndexedDbQuery.IndexedDbQueryError({
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
                new IndexedDbQuery.IndexedDbQueryError({
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

    // @ts-expect-error
    const tableSchema = query.select.from.source.tables.pipe(
      HashMap.unsafeGet(query.select.from.table),
      (_: any) => _.tableSchema
    )

    return yield* Schema.decodeUnknown(tableSchema)(data).pipe(
      Effect.mapError(
        (error) =>
          new IndexedDbQuery.IndexedDbQueryError({
            reason: "DecodeError",
            cause: error
          })
      )
    )
  })

const applyModify = (query: IndexedDbQueryBuilder.Modify, value: any) =>
  Effect.async<any, IndexedDbQuery.IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const objectStore = database.transaction([query.from.table], "readwrite").objectStore(query.from.table)

    let request: globalThis.IDBRequest<IDBValidKey>

    if (query.operation === "add") {
      request = objectStore.add(value)
    } else if (query.operation === "put") {
      request = objectStore.put(value)
    } else {
      return resume(Effect.dieMessage("Invalid modify operation"))
    }

    request.onerror = (event) => {
      resume(
        Effect.fail(
          new IndexedDbQuery.IndexedDbQueryError({
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

const BasicProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const Proto = {
  ...Effectable.CommitPrototype,
  [TypeId]: TypeId
}

/** @internal */
export const fromMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly source: Source
  readonly table: Table
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
}): IndexedDbQueryBuilder.From<Source, Table> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, Proto)
  IndexedDbQueryBuilder.source = options.source
  IndexedDbQueryBuilder.table = options.table
  IndexedDbQueryBuilder.database = options.database
  IndexedDbQueryBuilder.IDBKeyRange = options.IDBKeyRange

  IndexedDbQueryBuilder.select = <
    Index extends IndexedDbMigration.IndexFromTable<Source, Table>
  >(index?: Index) =>
    selectMakeProto({
      from: IndexedDbQueryBuilder as any,
      // @ts-expect-error
      index
    })

  IndexedDbQueryBuilder.delete = <
    Index extends IndexedDbMigration.IndexFromTable<Source, Table>
  >(index?: Index) =>
    deletePartialMakeProto({
      from: IndexedDbQueryBuilder as any,
      // @ts-expect-error
      index
    })

  IndexedDbQueryBuilder.insert = (value: any) =>
    modifyMakeProto({ from: IndexedDbQueryBuilder as any, value, operation: "add" })

  IndexedDbQueryBuilder.upsert = (value: any) =>
    modifyMakeProto({ from: IndexedDbQueryBuilder as any, value, operation: "put" })

  return IndexedDbQueryBuilder as any
}

const deletePartialMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.From<Source, Table>
  readonly index: Index | undefined
}): IndexedDbQueryBuilder.DeletePartial<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: IndexedDbQueryBuilderImpl as any, limitValue: limit })

  const equals = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: IndexedDbQueryBuilderImpl as any, only: value })

  const gte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      lowerBound: value,
      excludeLowerBound: false
    })

  const lte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      upperBound: value,
      excludeUpperBound: false
    })

  const gt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      lowerBound: value,
      excludeLowerBound: true
    })

  const lt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      upperBound: value,
      excludeUpperBound: true
    })

  const between = (
    lowerBound: ExtractIndexType<Source, Table, Index>,
    upperBound: ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false
    })

  Object.setPrototypeOf(IndexedDbQueryBuilderImpl, Object.assign(Object.create(BasicProto)))
  IndexedDbQueryBuilderImpl.from = options.from
  IndexedDbQueryBuilderImpl.index = options.index
  IndexedDbQueryBuilderImpl.equals = equals
  IndexedDbQueryBuilderImpl.gte = gte
  IndexedDbQueryBuilderImpl.lte = lte
  IndexedDbQueryBuilderImpl.gt = gt
  IndexedDbQueryBuilderImpl.lt = lt
  IndexedDbQueryBuilderImpl.between = between
  IndexedDbQueryBuilderImpl.limit = limit
  return IndexedDbQueryBuilderImpl as any
}

const deleteMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly delete: IndexedDbQueryBuilder.DeletePartial<Source, Table, Index>
  readonly limitValue?: number | undefined
  readonly only?: ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: ExtractIndexType<Source, Table, Index>
  readonly upperBound?: ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQueryBuilder.Delete<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: options.delete, limitValue: limit })

  const equals = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: options.delete, only: value, limitValue: options.limitValue })

  const gte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: ExtractIndexType<Source, Table, Index>,
    upperBound: ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(Proto), {
      commit(this: IndexedDbQueryBuilder.Delete) {
        return applyDelete(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.delete = options.delete
  IndexedDbQueryBuilderImpl.limitValue = options.limitValue
  IndexedDbQueryBuilderImpl.only = options.only
  IndexedDbQueryBuilderImpl.lowerBound = options.lowerBound
  IndexedDbQueryBuilderImpl.upperBound = options.upperBound
  IndexedDbQueryBuilderImpl.excludeLowerBound = options.excludeLowerBound
  IndexedDbQueryBuilderImpl.excludeUpperBound = options.excludeUpperBound
  IndexedDbQueryBuilderImpl.equals = equals
  IndexedDbQueryBuilderImpl.gte = gte
  IndexedDbQueryBuilderImpl.lte = lte
  IndexedDbQueryBuilderImpl.gt = gt
  IndexedDbQueryBuilderImpl.lt = lt
  IndexedDbQueryBuilderImpl.between = between
  IndexedDbQueryBuilderImpl.limit = limit
  return IndexedDbQueryBuilderImpl as any
}

const selectMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.From<Source, Table>
  readonly index: Index | undefined
  readonly limitValue: number | undefined
  readonly only?: ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: ExtractIndexType<Source, Table, Index>
  readonly upperBound?: ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQueryBuilder.Select<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index, limitValue: limit })

  const equals = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: ExtractIndexType<Source, Table, Index>,
    upperBound: ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  const first = (): IndexedDbQueryBuilder.First<Source, Table, Index> =>
    firstMakeProto({ select: IndexedDbQueryBuilderImpl as any })

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(Proto), {
      commit(this: IndexedDbQueryBuilder.Select) {
        return getSelect(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.from = options.from
  IndexedDbQueryBuilderImpl.index = options.index
  IndexedDbQueryBuilderImpl.only = options.only
  IndexedDbQueryBuilderImpl.limitValue = options.limitValue
  IndexedDbQueryBuilderImpl.lowerBound = options.lowerBound
  IndexedDbQueryBuilderImpl.upperBound = options.upperBound
  IndexedDbQueryBuilderImpl.excludeLowerBound = options.excludeLowerBound
  IndexedDbQueryBuilderImpl.excludeUpperBound = options.excludeUpperBound
  IndexedDbQueryBuilderImpl.equals = equals
  IndexedDbQueryBuilderImpl.gte = gte
  IndexedDbQueryBuilderImpl.lte = lte
  IndexedDbQueryBuilderImpl.gt = gt
  IndexedDbQueryBuilderImpl.lt = lt
  IndexedDbQueryBuilderImpl.between = between
  IndexedDbQueryBuilderImpl.limit = limit
  IndexedDbQueryBuilderImpl.first = first
  return IndexedDbQueryBuilderImpl as any
}

const firstMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly select: IndexedDbQueryBuilder.Select<Source, Table, Index>
}): IndexedDbQueryBuilder.First<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(Proto), {
      commit(this: IndexedDbQueryBuilder.First) {
        return getFirst(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.select = options.select
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
const modifyMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQueryBuilder.From<Source, Table>
  readonly value: Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >
  readonly operation: "add" | "put"
}): IndexedDbQueryBuilder.Modify<Source, Table> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(Proto), {
      commit(this: IndexedDbQueryBuilder.Modify) {
        return applyModify(this, options.value)
      }
    })
  )
  IndexedDbQueryBuilderImpl.from = options.from
  IndexedDbQueryBuilderImpl.value = options.value
  IndexedDbQueryBuilderImpl.operation = options.operation
  return IndexedDbQueryBuilderImpl as any
}
