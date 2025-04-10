/**
 * @since 1.0.0
 */
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as IndexedDbMigration from "./IndexedDbMigration.js"
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

    readonly [TypeId]: TypeId
    readonly from: From<Source, Table>
    readonly index?: Index

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
    ) => Where<Source, Table, Index>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Where<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
    Table extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    > = never,
    Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
  > extends Pipeable {
    new(_: never): {}

    readonly [TypeId]: TypeId
    readonly select: Select<Source, Table, Index>
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
  }
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const fromMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>
>(options: {
  readonly source: Source
  readonly table: Table
}): IndexedDbQueryBuilder.From<Source, Table> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, Proto)
  IndexedDbQueryBuilder.source = options.source
  IndexedDbQueryBuilder.table = options.table
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
}): IndexedDbQueryBuilder.Select<Source, Table, Index> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, Proto)
  IndexedDbQueryBuilder.from = options.from
  IndexedDbQueryBuilder.index = options.index
  IndexedDbQueryBuilder.equals = (
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
  ): IndexedDbQueryBuilder.Where<Source, Table, Index> =>
    whereMakeProto({ select: IndexedDbQueryBuilder as any, only: value })
  return IndexedDbQueryBuilder as any
}

/** @internal */
export const whereMakeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<IndexedDbVersion.IndexedDbVersion.Tables<Source>>,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly select: IndexedDbQueryBuilder.Select<Source, Table, Index>
  readonly only?: Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDbVersion.IndexedDbVersion.Tables<Source>,
        Table
      >
    >
  >
}): IndexedDbQueryBuilder.Where<Source, Table, Index> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, Proto)
  IndexedDbQueryBuilder.select = options.select
  IndexedDbQueryBuilder.only = options.only
  return IndexedDbQueryBuilder as any
}
