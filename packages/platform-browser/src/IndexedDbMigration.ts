/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type * as Schema from "effect/Schema"
import type * as IndexedDbTable from "./IndexedDbTable.js"
import type * as IndexedDbVersion from "./IndexedDbVersion.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbMigration"
)

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

export interface MigrationApi<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
> {
  readonly createObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<globalThis.IDBObjectStore>

  readonly deleteObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<void>

  readonly getAll: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<
    Array<
      Schema.Schema.Type<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            A
          >
        >
      >
    >
  >

  readonly insert: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    data: Schema.Schema.Encoded<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          A
        >
      >
    >
  ) => Effect.Effect<globalThis.IDBValidKey>

  readonly insertAll: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    dataList: ReadonlyArray<
      Schema.Schema.Encoded<
        IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            A
          >
        >
      >
    >
  ) => Effect.Effect<globalThis.IDBValidKey>
}

/**
 * @since 1.0.0
 * @category interface
 */
export interface IndexedDbMigration<
  in out FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  in out ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  out Error = never
> extends Pipeable {
  new(_: never): {}

  readonly [TypeId]: TypeId
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbMigration {
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
  export type AnyWithProps = IndexedDbMigration<
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    any
  >
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly fromVersion: FromVersion
  readonly toVersion: ToVersion
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>
}): IndexedDbMigration<FromVersion, ToVersion, Error> => {
  function IndexedDbMigration() {}
  Object.setPrototypeOf(IndexedDbMigration, Proto)
  IndexedDbMigration.fromVersion = options.fromVersion
  IndexedDbMigration.toVersion = options.toVersion
  IndexedDbMigration.execute = options.execute
  return IndexedDbMigration as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = makeProto
