/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import * as Effect from "effect/Effect"
import { pipeArguments } from "effect/Pipeable"
import type * as IndexedDbQuery from "../IndexedDbQuery.js"
import type * as IndexedDbQueryBuilder from "../IndexedDbQueryBuilder.js"
import type * as IndexedDbTable from "../IndexedDbTable.js"
import type * as IndexedDbVersion from "../IndexedDbVersion.js"
import * as internal from "./indexedDbQueryBuilder.js"

/** @internal */
export const TypeId: IndexedDbQuery.TypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery"
) as IndexedDbQuery.TypeId

/** @internal */
export type TypeId = typeof TypeId

/** @internal */
export const ErrorTypeId: IndexedDbQuery.ErrorTypeId = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery/IndexedDbQueryError"
) as IndexedDbQuery.ErrorTypeId

/** @internal */
export type ErrorTypeId = typeof ErrorTypeId

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

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const makeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>({
  IDBKeyRange,
  database,
  source,
  transaction
}: {
  readonly database: globalThis.IDBDatabase
  readonly IDBKeyRange: typeof globalThis.IDBKeyRange
  readonly source: Source
  readonly transaction: globalThis.IDBTransaction | undefined
}): IndexedDbQuery.IndexedDbQuery<Source> => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, Proto)
  IndexedDbQuery.source = source
  IndexedDbQuery.database = database
  IndexedDbQuery.IDBKeyRange = IDBKeyRange

  IndexedDbQuery.from = <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(table: A) => internal.fromMakeProto({ database, IDBKeyRange, source, table, transaction })

  IndexedDbQuery.clearAll = internal.clearAllMakeProto({ database, source, transaction })

  IndexedDbQuery.transaction = (
    tables: Array<IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>>,
    mode: globalThis.IDBTransactionMode,
    callback: (api: {
      readonly from: <
        A extends IndexedDbTable.IndexedDbTable.TableName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>
        >
      >(table: A) => IndexedDbQueryBuilder.IndexedDbQueryBuilder.From<Source, A>
    }) => Effect.Effect<void>,
    options?: globalThis.IDBTransactionOptions
  ) =>
    Effect.gen(function*() {
      const transaction = database.transaction(tables, mode, options)
      return yield* callback({
        from: (table) => internal.fromMakeProto({ database, IDBKeyRange, source, table, transaction })
      })
    })

  return IndexedDbQuery as any
}
