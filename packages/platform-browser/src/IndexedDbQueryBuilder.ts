/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as HashMap from "effect/HashMap"
import { type Pipeable } from "effect/Pipeable"
import * as Schema from "effect/Schema"
import type * as IndexedDbMigration from "./IndexedDbMigration.js"
import * as IndexedDbQuery from "./IndexedDbQuery.js"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

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

    readonly select: <
      Index extends IndexedDbMigration.IndexFromTable<Source, Table>
    >(index?: Index) => Select<Source, Table, Index>
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
    readonly only?: Schema.Schema.Type<
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
    readonly lowerBound?: Schema.Schema.Type<
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

    readonly equals: (
      value: Schema.Schema.Type<
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
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">

    readonly gte: (
      value: Schema.Schema.Type<
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
    ) => Omit<Select<Source, Table, Index>, "equals" | "gte" | "lte" | "gt" | "lt" | "between">
  }
}

const getSelect = (query: IndexedDbQueryBuilder.Select) =>
  Effect.gen(function*() {
    const data = yield* Effect.async<any, IndexedDbQuery.IndexedDbQueryError>((resume) => {
      const database = query.from.database
      const IDBKeyRange = query.from.IDBKeyRange
      const objectStore = database.transaction([query.from.table]).objectStore(query.from.table)

      let request: globalThis.IDBRequest
      let keyRange: globalThis.IDBKeyRange | undefined = undefined

      if (query.only !== undefined) {
        keyRange = IDBKeyRange.only(query.only)
      } else if (query.lowerBound !== undefined) {
        keyRange = IDBKeyRange.lowerBound(query.lowerBound)
      }

      if (query.index !== undefined) {
        const index = objectStore.index(query.index)
        request = index.getAll(keyRange)
      } else {
        request = objectStore.getAll(keyRange)
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
  return IndexedDbQueryBuilder as any
}

/** @internal */
const selectMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly from: IndexedDbQueryBuilder.From<Source, Table>
  readonly index?: Index
  readonly only?: Schema.Schema.Type<
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
  readonly lowerBound?: Schema.Schema.Type<
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
}): IndexedDbQueryBuilder.Select<Source, Table, Index> => {
  function IndexedDbQueryBuilderImpl() {}

  const equals = (
    value: Schema.Schema.Type<
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
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index as any, only: value })

  const gte = (
    value: Schema.Schema.Type<
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
  ): IndexedDbQueryBuilder.Select<Source, Table, Index> =>
    selectMakeProto({ from: options.from, index: options.index as any, only: undefined, lowerBound: value })

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
  IndexedDbQueryBuilderImpl.lowerBound = options.lowerBound
  IndexedDbQueryBuilderImpl.equals = equals
  IndexedDbQueryBuilderImpl.gte = gte
  return IndexedDbQueryBuilderImpl as any
}
