/**
 * @since 1.0.0
 */
import * as DurableExecutionEvent from "@effect/cluster-workflow/DurableExecutionEvent"
import * as SqlClient from "@effect/sql/SqlClient"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

const SymbolKey = "@effect/cluster-workflow/DurableExecutionJournal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const DurableExecutionJournalTypeId: unique symbol = Symbol.for(SymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type DurableExecutionJournalTypeId = typeof DurableExecutionJournalTypeId

/**
 * @since 1.0.0
 */
export interface DurableExecutionJournal {
  readonly [DurableExecutionJournalTypeId]: DurableExecutionJournalTypeId
  read<A, IA, E, IE>(
    persistenceId: string,
    success: Schema.Schema<A, IA>,
    failure: Schema.Schema<E, IE>,
    fromSequence: number,
    keepReading: boolean
  ): Stream.Stream<DurableExecutionEvent.DurableExecutionEvent<A, E>>
  append<A, IA, E, IE>(
    persistenceId: string,
    success: Schema.Schema<A, IA>,
    failure: Schema.Schema<E, IE>,
    event: DurableExecutionEvent.DurableExecutionEvent<A, E>
  ): Effect.Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace DurableExecutionJournal {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface MakeOptions {
    readonly table: string
  }
}

/**
 * @since 1.0.0
 */
export const DurableExecutionJournal = Context.GenericTag<DurableExecutionJournal>(SymbolKey)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = ({ table }: DurableExecutionJournal.MakeOptions) =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    yield* sql.onDialectOrElse({
      mssql: () =>
        sql`
          IF OBJECT_ID(N'${sql.literal(table)}', N'U') IS NULL
          CREATE TABLE ${sql(table)} (
            execution_id VARCHAR(255) NOT NULL,
            sequence INT NOT NULL DEFAULT 0,
            event_json TEXT NOT NULL,
            CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (execution_id, sequence)
          )
      `,
      mysql: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(table)} (
            execution_id VARCHAR(255) NOT NULL,
            sequence INT NOT NULL DEFAULT 0,
            event_json TEXT NOT NULL,
            CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (execution_id, sequence)
          )
        `,
      pg: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(table)} (
            execution_id VARCHAR(255) NOT NULL,
            sequence INT DEFAULT 0,
            event_json TEXT NOT NULL,
            CONSTRAINT ${sql(table)}_pkey PRIMARY KEY (execution_id, sequence)
          )
        `,
      orElse: () =>
        sql`
          CREATE TABLE IF NOT EXISTS ${sql(table)} (
            execution_id VARCHAR(255) NOT NULL,
            sequence INT DEFAULT 0,
            event_json CLOB NOT NULL,
            CONSTRAINT ${sql.literal(table)}_pkey PRIMARY KEY (execution_id, sequence)
          )
        `
    })

    // TODO: handle duplicate keys?
    const append = <A, IA, E, IE>(
      executionId: string,
      success: Schema.Schema<A, IA>,
      failure: Schema.Schema<E, IE>,
      event: DurableExecutionEvent.DurableExecutionEvent<A, E>
    ) => {
      const schema = Schema.parseJson(DurableExecutionEvent.schema(success, failure))
      const encode = Schema.encode(schema)
      return encode(event).pipe(
        Effect.flatMap((json) =>
          sql`
          INSERT INTO ${sql(table)}
          ${
            sql.insert({
              execution_id: executionId,
              sequence: event.sequence,
              event_json: json
            })
          }
        `
        ),
        Effect.orDie
      )
    }

    const read = <A, IA, E, IE>(
      executionId: string,
      success: Schema.Schema<A, IA>,
      failure: Schema.Schema<E, IE>,
      fromSequence: number,
      _keepReading: boolean
    ) => {
      const schema = Schema.Array(Schema.parseJson(DurableExecutionEvent.schema(success, failure)))
      const decode = Schema.decode(schema)
      return sql<{ event_json: string }>`
      SELECT event_json
      FROM ${sql(table)}
      WHERE ${
        sql.and([
          sql`execution_id = ${executionId}`,
          sql`sequence >= ${fromSequence}`
        ])
      } ORDER BY sequence ASC`.pipe(
        Effect.flatMap((results) => decode(results.map(({ event_json }) => event_json))),
        Effect.orDie,
        Stream.fromIterableEffect
      )
    }

    const self: DurableExecutionJournal = {
      [DurableExecutionJournalTypeId]: DurableExecutionJournalTypeId,
      append,
      read
    }

    return self
  })

/**
 * @since 1.0.0
 * @category context
 */
export const layer = (options: DurableExecutionJournal.MakeOptions) =>
  Layer.effect(DurableExecutionJournal, make(options))
