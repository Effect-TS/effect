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
export interface IndexedDbQueryBuilder<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  > = never,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table> = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly source: Source

  readonly table: Table
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
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const makeProto = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(options: {
  readonly source: Source
  readonly table: Table
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
}): IndexedDbQueryBuilder<Source, Table, Index> => {
  function IndexedDbQueryBuilder() {}
  Object.setPrototypeOf(IndexedDbQueryBuilder, Proto)
  IndexedDbQueryBuilder.source = options.source
  IndexedDbQueryBuilder.table = options.table
  IndexedDbQueryBuilder.index = options.index
  IndexedDbQueryBuilder.only = options.only
  return IndexedDbQueryBuilder as any
}

export const from = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >
>(source: Source, table: Table): IndexedDbQueryBuilder<Source, Table> => makeProto({ source, table })

export const select = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(index?: Index) =>
(
  query: IndexedDbQueryBuilder<Source, Table, Index>
): IndexedDbQueryBuilder<Source, Table, Index> =>
  // @ts-expect-error: `IndexFromTable` checks for string literal
  makeProto({ source: query.source, table: query.table, index: index ?? undefined })

export const equals = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Table extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDbVersion.IndexedDbVersion.Tables<Source>
  >,
  Index extends IndexedDbMigration.IndexFromTable<Source, Table>
>(
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
) =>
(
  query: IndexedDbQueryBuilder<Source, Table, Index>
): IndexedDbQueryBuilder<Source, Table, Index> =>
  // @ts-expect-error: `IndexFromTable` checks for string literal
  makeProto({ source: query.source, table: query.table, index: query.index, only: value })
