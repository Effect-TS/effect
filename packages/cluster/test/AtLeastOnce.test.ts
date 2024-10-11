import * as AtLeastOnce from "@effect/cluster/AtLeastOnce"
import * as AtLeastOnceStorage from "@effect/cluster/AtLeastOnceStorage"
import * as MessageState from "@effect/cluster/MessageState"
import * as Pods from "@effect/cluster/Pods"
import * as PodsHealth from "@effect/cluster/PodsHealth"
import * as RecipientBehaviour from "@effect/cluster/RecipientBehaviour"
import * as RecipientType from "@effect/cluster/RecipientType"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardManagerClient from "@effect/cluster/ShardManagerClient"
import * as Storage from "@effect/cluster/Storage"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Sqlite from "@effect/sql-sqlite-node/SqliteClient"
import * as SqlClient from "@effect/sql/SqlClient"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()(
  "SampleMessage",
  {
    failure: Schema.Never,
    success: Schema.Void,
    payload: {
      id: Schema.String,
      value: Schema.Number
    }
  }
) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const SampleEntity = RecipientType.makeEntityType("SampleEntity", SampleMessage)
type SampleEntity = SampleMessage

const makeSqlClient = Effect.gen(function*(_) {
  const fs = yield* _(FileSystem.FileSystem)
  const dir = yield* _(fs.makeTempDirectoryScoped())
  return yield* _(Sqlite.make({
    filename: dir + "/test.db"
  }))
}).pipe(Effect.provide(NodeFileSystem.layer))

const runTest =
  (options: AtLeastOnceStorage.AtLeastOnceStorage.MakeOptions) => <A, E, R>(program: Effect.Effect<A, E, R>) =>
    Effect.gen(function*() {
      const sqlClient = yield* makeSqlClient
      const TestLive = AtLeastOnceStorage.layer(options).pipe(
        Layer.provideMerge(Sharding.live),
        Layer.provideMerge(PodsHealth.local),
        Layer.provideMerge(Pods.noop),
        Layer.provideMerge(Storage.memory),
        Layer.provideMerge(Serialization.json),
        Layer.provideMerge(ShardManagerClient.local),
        Layer.provideMerge(ShardingConfig.withDefaults({
          entityTerminationTimeout: Duration.seconds(4)
        })),
        Layer.provideMerge(Layer.succeed(SqlClient.SqlClient, sqlClient))
      )
      yield* program.pipe(Effect.provide(TestLive))
    }).pipe(
      Effect.scoped,
      Effect.tapErrorCause(Effect.logError),
      // @ts-expect-error
      Effect.runPromise
    )

describe("AtLeastOnce", () => {
  it("should create the message table upon layer creation", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      const rows = yield* sql<{ table_name: string }>`
        SELECT name AS table_name
        FROM sqlite_schema
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      `

      expect(rows).toEqual([{ table_name: "test_creation" }])
    }).pipe(runTest({
      table: "test_creation"
    })))

  it("should store the message in the message table after sending", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      yield* Sharding.registerScoped

      yield* Sharding.registerEntity(SampleEntity)(pipe(
        RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Acknowledged)),
        AtLeastOnce.atLeastOnceRecipientBehaviour
      ))

      const messenger = yield* Sharding.messenger(SampleEntity)
      const message = new SampleMessage({ id: "a", value: 42 })
      yield* messenger.sendDiscard("entity1")(message)

      const rows = yield* sql<{ message_id: string }>`
        SELECT message_id
        FROM test_storage
      `

      expect(rows).toEqual([{ message_id: "a" }])
    }).pipe(runTest({
      table: "test_storage"
    })))

  it("should mark a message as processed if the message state is processed", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      yield* Sharding.registerScoped

      yield* Sharding.registerEntity(SampleEntity)(pipe(
        RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Processed(Exit.void))),
        AtLeastOnce.atLeastOnceRecipientBehaviour
      ))

      const messenger = yield* Sharding.messenger(SampleEntity)
      const message = new SampleMessage({ id: "a", value: 42 })
      yield* messenger.sendDiscard("entity1")(message)

      const rows = yield* sql<{ message_id: string }>`
        SELECT message_id
        FROM test_mark_processed
        WHERE processed = TRUE
      `

      expect(rows).toEqual([{ message_id: "a" }])
    }).pipe(
      runTest({
        table: "test_mark_processed"
      })
    ))

  it("should not mark as processed if a message state is acknowledged", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient

      yield* Sharding.registerScoped

      yield* Sharding.registerEntity(SampleEntity)(pipe(
        RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Acknowledged)),
        AtLeastOnce.atLeastOnceRecipientBehaviour
      ))

      const messenger = yield* Sharding.messenger(SampleEntity)
      const message = new SampleMessage({ id: "a", value: 42 })
      yield* messenger.sendDiscard("entity1")(message)

      const rows = yield* sql<{ message_id: string }>`
        SELECT message_id
        FROM test_acknowledged_unprocessed
        WHERE processed = FALSE
      `

      expect(rows).toEqual([{ message_id: "a" }])
    }).pipe(
      runTest({
        table: "test_acknowledged_unprocessed"
      })
    ))
})
