import { TypeIdError } from "@effect/platform/Error"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as HashMap from "effect/HashMap"
import * as Schema from "effect/Schema"
import type * as IndexedDbQueryBuilder from "../IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "../IndexedDbTable.js"
import type * as IndexedDbVersion from "../IndexedDbVersion.js"
import { type IndexFromTable } from "./indexedDbDatabase.js"

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
export type IsNever<T> = [T] extends [never] ? true : false

/** @internal */
export type IsKeyPathMissing<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
> = IsNever<
  IndexedDbTable.IndexedDbTable.KeyPath<
    IndexedDbTable.IndexedDbTable.WithName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>,
      Table
    >
  >
>

/** @internal */
export type KeyPath<TableSchema extends Schema.Schema.AnyNoContext> =
  | IndexedDbValidKeys<TableSchema>
  | Array<IndexedDbValidKeys<TableSchema>>

/** @internal */
export const TypeId: IndexedDbQueryBuilder.TypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery"
) as IndexedDbQueryBuilder.TypeId

/** @internal */
export const ErrorTypeId: IndexedDbQueryBuilder.ErrorTypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery/IndexedDbQueryError"
) as IndexedDbQueryBuilder.ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class IndexedDbQueryError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbQueryError"
)<{
  readonly reason: "TransactionError" | "DecodeError" | "UnknownError" | "NotFoundError"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

const BasicProto = { [TypeId]: TypeId }
const CommitProto = { ...Effectable.CommitPrototype, [TypeId]: TypeId }

/** @internal */
export const applyDelete = (query: IndexedDbQueryBuilder.IndexedDbQuery.Delete) =>
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
  query: IndexedDbQueryBuilder.IndexedDbQuery.Select | IndexedDbQueryBuilder.IndexedDbQuery.Count
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
  from: IndexedDbQueryBuilder.IndexedDbQuery.From
) => {
  const table = HashMap.unsafeGet(from.tables, from.table) as IndexedDbTable.IndexedDbTable.AnyWithProps
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

/** @internal */
export const getSelect = (query: IndexedDbQueryBuilder.IndexedDbQuery.Select) =>
  Effect.gen(function*() {
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

/** @internal */
export const getFirst = (query: IndexedDbQueryBuilder.IndexedDbQuery.First) =>
  Effect.gen(function*() {
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

/** @internal */
export const applyModify = (
  query: IndexedDbQueryBuilder.IndexedDbQuery.Modify,
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

/** @internal */
export const applyModifyAll = (query: IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll, values: Array<any>) =>
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
          new IndexedDbQueryError({ reason: "TransactionError", cause: objectStore.transaction.error })
        )
      )
    }

    objectStore.transaction.oncomplete = () => {
      resume(Effect.succeed(results))
    }
  })

/** @internal */
export const applyClear = (query: IndexedDbQueryBuilder.IndexedDbQuery.Clear) =>
  Effect.async<void, IndexedDbQueryError>((resume) => {
    const database = query.from.database
    const transaction = query.from.transaction
    const objectStore = (transaction ?? database.transaction([query.from.table], "readwrite")).objectStore(
      query.from.table
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

/** @internal */
export const applyClearAll = (query: IndexedDbQueryBuilder.IndexedDbQuery.ClearAll) =>
  Effect.async<void, IndexedDbQueryError>((resume) => {
    const database = query.database
    const tables = database.objectStoreNames

    const transaction = query.transaction ?? database.transaction(tables, "readwrite")

    for (let t = 0; t < tables.length; t++) {
      const objectStore = transaction.objectStore(tables[t])
      const request = objectStore.clear()

      request.onerror = () => {
        resume(
          Effect.fail(new IndexedDbQueryError({ reason: "TransactionError", cause: request.error }))
        )
      }
    }

    transaction.onerror = () => {
      resume(
        Effect.fail(
          new IndexedDbQueryError({ reason: "TransactionError", cause: transaction.error })
        )
      )
    }

    transaction.oncomplete = () => {
      resume(Effect.void)
    }
  })

/** @internal */
export const getCount = (query: IndexedDbQueryBuilder.IndexedDbQuery.Count) =>
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

/** @internal */
export const fromMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  readonly table: Table
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, CommitProto)
  IndexedDbQueryBuilder.tables = options.tables
  IndexedDbQueryBuilder.table = options.table
  IndexedDbQueryBuilder.database = options.database
  IndexedDbQueryBuilder.IDBKeyRange = options.IDBKeyRange
  IndexedDbQueryBuilder.transaction = options.transaction
  IndexedDbQueryBuilder.select = <
    Index extends IndexFromTable<Source, Table>
  >(index?: Index) =>
    selectMakeProto({
      from: IndexedDbQueryBuilder as any,
      // @ts-expect-error
      index
    })

  IndexedDbQueryBuilder.delete = <
    Index extends IndexFromTable<Source, Table>
  >(index?: Index) =>
    deletePartialMakeProto({
      from: IndexedDbQueryBuilder as any,
      // @ts-expect-error
      index
    })

  IndexedDbQueryBuilder.count = <
    Index extends IndexFromTable<Source, Table>
  >(index?: Index) =>
    countMakeProto({
      from: IndexedDbQueryBuilder as any,
      // @ts-expect-error
      index
    })

  IndexedDbQueryBuilder.insert = (value: any) =>
    modifyMakeProto({ from: IndexedDbQueryBuilder as any, value, operation: "add" })

  IndexedDbQueryBuilder.upsert = (value: any) =>
    modifyMakeProto({ from: IndexedDbQueryBuilder as any, value, operation: "put" })

  IndexedDbQueryBuilder.insertAll = (values: Array<any>) =>
    modifyAllMakeProto({ from: IndexedDbQueryBuilder as any, values, operation: "add" })

  IndexedDbQueryBuilder.upsertAll = (values: Array<any>) =>
    modifyAllMakeProto({ from: IndexedDbQueryBuilder as any, values, operation: "put" })

  IndexedDbQueryBuilder.clear = clearMakeProto({ from: IndexedDbQueryBuilder as any })

  return IndexedDbQueryBuilder as any
}

/** @internal */
export const deletePartialMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
}): IndexedDbQueryBuilder.IndexedDbQuery.DeletePartial<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: IndexedDbQueryBuilderImpl as any, limitValue: limit })

  const equals = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: IndexedDbQueryBuilderImpl as any, only: value })

  const gte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      lowerBound: value,
      excludeLowerBound: false
    })

  const lte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      upperBound: value,
      excludeUpperBound: false
    })

  const gt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      lowerBound: value,
      excludeLowerBound: true
    })

  const lt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: IndexedDbQueryBuilderImpl as any,
      upperBound: value,
      excludeUpperBound: true
    })

  const between = (
    lowerBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
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

/** @internal */
export const deleteMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexFromTable<Source, Table>
>(options: {
  readonly delete: IndexedDbQueryBuilder.IndexedDbQuery.DeletePartial<Source, Table, Index>
  readonly limitValue?: number | undefined
  readonly only?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
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
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({ delete: options.delete, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
    deleteMakeProto({
      delete: options.delete,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.IndexedDbQuery.Delete<Source, Table, Index> =>
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
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.Delete) {
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

/** @internal */
export const countMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
  readonly limitValue: number | undefined
  readonly only?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
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
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.IndexedDbQuery.Count<Source, Table, Index> =>
    countMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.Count) {
        return getCount(this)
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
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const selectMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
  readonly index: Index | undefined
  readonly limitValue: number | undefined
  readonly only?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly lowerBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly upperBound?: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  readonly excludeLowerBound?: boolean
  readonly excludeUpperBound?: boolean
}): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const limit = (
    limit: number
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
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
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index, only: value, limitValue: options.limitValue })

  const gte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: false,
      limitValue: options.limitValue
    })

  const lte = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: false,
      limitValue: options.limitValue
    })

  const gt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound: value,
      excludeLowerBound: true,
      limitValue: options.limitValue
    })

  const lt = (
    value: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      upperBound: value,
      excludeUpperBound: true,
      limitValue: options.limitValue
    })

  const between = (
    lowerBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    upperBound: IndexedDbQueryBuilder.IndexedDbQuery.ExtractIndexType<Source, Table, Index>,
    queryOptions?: { excludeLowerBound?: boolean; excludeUpperBound?: boolean }
  ): IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index> =>
    selectMakeProto({
      from: options.from,
      index: options.index,
      lowerBound,
      upperBound,
      excludeLowerBound: queryOptions?.excludeLowerBound ?? false,
      excludeUpperBound: queryOptions?.excludeUpperBound ?? false,
      limitValue: options.limitValue
    })

  const first = (): IndexedDbQueryBuilder.IndexedDbQuery.First<Source, Table, Index> =>
    firstMakeProto({ select: IndexedDbQueryBuilderImpl as any })

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.Select) {
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

/** @internal */
export const firstMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexFromTable<Source, Table>
>(options: {
  readonly select: IndexedDbQueryBuilder.IndexedDbQuery.Select<Source, Table, Index>
}): IndexedDbQueryBuilder.IndexedDbQuery.First<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.First) {
        return getFirst(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.select = options.select
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const modifyMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
  readonly value: Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >
  readonly operation: "add" | "put"
}): IndexedDbQueryBuilder.IndexedDbQuery.Modify<Source, Table> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.Modify) {
        return applyModify(this, options.value)
      }
    })
  )
  IndexedDbQueryBuilderImpl.from = options.from
  IndexedDbQueryBuilderImpl.value = options.value
  IndexedDbQueryBuilderImpl.operation = options.operation
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const modifyAllMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
  readonly values: Array<
    Schema.Schema.Type<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          Table
        >
      >
    >
  >
  readonly operation: "add" | "put"
}): IndexedDbQueryBuilder.IndexedDbQuery.Modify<Source, Table> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.ModifyAll) {
        return applyModifyAll(this, options.values)
      }
    })
  )
  IndexedDbQueryBuilderImpl.from = options.from
  IndexedDbQueryBuilderImpl.values = options.values
  IndexedDbQueryBuilderImpl.operation = options.operation
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const clearMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly from: IndexedDbQueryBuilder.IndexedDbQuery.From<Source, Table>
}): IndexedDbQueryBuilder.IndexedDbQuery.Clear<Source, Table> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.Clear) {
        return applyClear(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.from = options.from
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const clearAllMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(options: {
  readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  readonly database: globalThis.IDBDatabase
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQueryBuilder.IndexedDbQuery.ClearAll<Source> => {
  function IndexedDbQueryBuilderImpl() {}

  Object.setPrototypeOf(
    IndexedDbQueryBuilderImpl,
    Object.assign(Object.create(CommitProto), {
      commit(this: IndexedDbQueryBuilder.IndexedDbQuery.ClearAll) {
        return applyClearAll(this)
      }
    })
  )
  IndexedDbQueryBuilderImpl.database = options.database
  IndexedDbQueryBuilderImpl.transaction = options.transaction
  IndexedDbQueryBuilderImpl.tables = options.tables
  return IndexedDbQueryBuilderImpl as any
}

/** @internal */
export const makeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  tables,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly tables: HashMap.HashMap<string, IndexedDbVersion.IndexedDbVersion.Tables<Source>>
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQueryBuilder.IndexedDbQueryBuilder<Source> => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, BasicProto)
  IndexedDbQuery.tables = tables
  IndexedDbQuery.database = database
  IndexedDbQuery.IDBKeyRange = IDBKeyRange

  IndexedDbQuery.use = <A>(f: (database: globalThis.IDBDatabase) => Promise<A>) =>
    Effect.tryPromise({
      try: () => f(database),
      catch: (error) =>
        new IndexedDbQueryError({
          reason: "UnknownError",
          cause: error
        })
    })

  IndexedDbQuery.from = <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(table: A) => fromMakeProto({ database, IDBKeyRange, tables, table, transaction })

  IndexedDbQuery.clearAll = clearAllMakeProto({ database, tables, transaction })

  IndexedDbQuery.transaction = (
    transactionTables: Array<IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>>,
    mode: globalThis.IDBTransactionMode,
    callback: (api: {
      readonly from: <
        A extends IndexedDbTable.IndexedDbTable.TableName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>
        >
      >(table: A) => IndexedDbQueryBuilder.IndexedDbQuery.From<Source, A>
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) =>
    Effect.gen(function*() {
      const transaction = database.transaction(transactionTables, mode, options)
      return yield* callback({
        from: (table) => fromMakeProto({ database, IDBKeyRange, tables, table, transaction })
      })
    })

  return IndexedDbQuery as any
}
