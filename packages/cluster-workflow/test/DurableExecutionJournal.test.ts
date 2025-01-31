import * as DurableExecutionEvent from "@effect/cluster-workflow/DurableExecutionEvent"
import * as DurableExecutionJournal from "@effect/cluster-workflow/DurableExecutionJournal"
import { Reactivity } from "@effect/experimental"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Sqlite from "@effect/sql-sqlite-node/SqliteClient"
import * as SqlClient from "@effect/sql/SqlClient"
import { describe, expect, it } from "@effect/vitest"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

const makeSqlClient = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const dir = yield* fs.makeTempDirectoryScoped()
  return yield* Sqlite.make({
    filename: dir + "/test.db"
  })
}).pipe(Effect.provide([NodeFileSystem.layer, Reactivity.layer]))

const runTest =
  (options: DurableExecutionJournal.DurableExecutionJournal.MakeOptions) =>
  <A, E, R>(program: Effect.Effect<A, E, R>) =>
    Effect.gen(function*() {
      const sqlClient = yield* makeSqlClient
      const TestLive = DurableExecutionJournal.layer(options).pipe(
        Layer.provideMerge(Layer.succeed(SqlClient.SqlClient, sqlClient))
      )
      yield* program.pipe(Effect.provide(TestLive))
    }).pipe(
      Effect.scoped,
      Effect.tapErrorCause(Effect.logError),
      // @ts-expect-error
      Effect.runPromise
    )

describe("DurableExecutionJournal", () => {
  it("should create the execution table upon layer creation", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      const rows = yield* sql<{ table_name: string }>`
        SELECT name AS table_name
        FROM sqlite_schema
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      `

      expect(rows).toEqual([{ table_name: "test_creation" }])
    }).pipe(runTest({ table: "test_creation" })))

  it("should store the execution in the table upon append", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const journal = yield* DurableExecutionJournal.DurableExecutionJournal

      yield* journal.append(
        "test",
        Schema.Never,
        Schema.Void,
        DurableExecutionEvent.Attempted("")(0)
      )

      const rows = yield* sql<{ execution_id: string }>`
        SELECT execution_id
        FROM test_store
      `

      expect(rows).toEqual([{ execution_id: "test" }])
    }).pipe(runTest({ table: "test_store" })))

  it("should read records after persisting them", () =>
    Effect.gen(function*() {
      const journal = yield* DurableExecutionJournal.DurableExecutionJournal

      yield* journal.append(
        "test",
        Schema.Never,
        Schema.Void,
        DurableExecutionEvent.Attempted("")(0)
      )

      const results = yield* journal.read(
        "test",
        Schema.Never,
        Schema.Void,
        0,
        false
      ).pipe(Stream.runCollect)

      expect(results).toEqual(Chunk.of(DurableExecutionEvent.Attempted("")(0)))
    }).pipe(runTest({ table: "test_read" })))
})
