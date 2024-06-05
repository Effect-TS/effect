/**
 * @since 1.0.0
 */
import * as DurableExecutionEvent from "@effect/cluster-workflow/DurableExecutionEvent"
import * as DurableExecutionJournal from "@effect/cluster-workflow/DurableExecutionJournal"
import * as Schema from "@effect/schema/Schema"
import * as Sql from "@effect/sql"
import * as Pg from "@effect/sql-pg"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"

function append<A, IA, E, IE>(
  tableName: string,
  persistenceId: string,
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  event: DurableExecutionEvent.DurableExecutionEvent<A, E>,
  sql: Pg.client.PgClient
): Effect.Effect<void> {
  return pipe(
    Schema.encode(Schema.parseJson(DurableExecutionEvent.schema(success, failure)))(event),
    Effect.flatMap((event_json) =>
      sql`INSERT INTO ${Sql.statement.unsafeFragment(tableName)} ${
        sql.insert({
          execution_id: persistenceId,
          sequence: event.sequence,
          event_json
        })
      }`
    ),
    Effect.orDie
  )
}

function read<A, IA, E, IE>(
  tableName: string,
  executionId: string,
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  fromSequence: number,
  sql: Pg.client.PgClient
): Stream.Stream<DurableExecutionEvent.DurableExecutionEvent<A, E>> {
  return pipe(
    sql<
      { event_json: string }
    >`SELECT event_json FROM ${
      Sql.statement.unsafeFragment(tableName)
    } WHERE execution_id = ${(executionId)} AND sequence >= ${fromSequence} ORDER BY sequence ASC`,
    Effect.flatMap((result) =>
      Schema.decode(Schema.Array(Schema.parseJson(DurableExecutionEvent.schema(success, failure))))(
        result.map((_) => _.event_json)
      )
    ),
    Effect.map(Stream.fromIterable),
    Stream.unwrap,
    Stream.orDie
  )
}

/**
 * @since 1.0.0
 */
export const makeDurableExecutionJournalPostgres = (tableName: string) =>
  Layer.effect(
    DurableExecutionJournal.DurableExecutionJournal,
    Effect.gen(function*(_) {
      const sql = yield* _(Pg.client.PgClient)

      yield* _(sql`
    CREATE TABLE IF NOT EXISTS ${Sql.statement.unsafeFragment(tableName)}
    (
        execution_id varchar(255) NOT NULL,
        sequence integer DEFAULT 0,
        event_json text NOT NULL,
        CONSTRAINT ${Sql.statement.unsafeFragment(tableName)}_pkey PRIMARY KEY (execution_id, sequence)
    )
    `)

      return ({
        append: (executionId, success, failure, event) => append(tableName, executionId, success, failure, event, sql),
        read: (executionId, success, failure, fromSequence) =>
          read(tableName, executionId, success, failure, fromSequence, sql)
      })
    })
  )
