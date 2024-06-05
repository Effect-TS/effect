import * as AtLeastOnceStoragePostgres from "@effect/cluster-pg/AtLeastOnceStoragePostgres"
import * as AtLeastOnce from "@effect/cluster/AtLeastOnce"
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
import * as Schema from "@effect/schema/Schema"
import * as Pg from "@effect/sql-pg"
import { PostgreSqlContainer } from "@testcontainers/postgresql"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Secret from "effect/Secret"
import { beforeAll, describe, expect, it } from "vitest"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()("SampleMessage", Schema.Never, Schema.Void, {
  id: Schema.String,
  value: Schema.Number
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const SampleEntity = RecipientType.makeEntityType("SampleEntity", SampleMessage)
type SampleEntity = SampleMessage

describe("AtLeastOncePostgres", () => {
  let connectionUri: string = ""

  beforeAll(async () => {
    const container = await new PostgreSqlContainer().start()
    connectionUri = container.getConnectionUri()
    return async () => await container.stop()
  })

  const withTestEnv = (tableName: string) => <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(
      fa,
      Effect.provide(AtLeastOnceStoragePostgres.makeAtLeastOnceStoragePostgres(tableName)),
      Effect.provide(Sharding.live),
      Effect.provide(PodsHealth.local),
      Effect.provide(Pods.noop),
      Effect.provide(Storage.memory),
      Effect.provide(Serialization.json),
      Effect.provide(ShardManagerClient.local),
      Effect.provide(
        ShardingConfig.withDefaults({
          entityTerminationTimeout: Duration.millis(4000)
        })
      ),
      Effect.provide(
        Layer.scoped(
          Pg.client.PgClient,
          Effect.suspend(() => Pg.client.make({ url: Secret.fromString(connectionUri) }))
        )
      ),
      Effect.scoped,
      Logger.withMinimumLogLevel(LogLevel.Debug)
    )

  it("Should create the message table upon layer creation", () => {
    return Effect.gen(function*(_) {
      const sql = yield* _(Pg.client.PgClient)

      const rows = yield* _(sql<{ table_name: string }>`
        SELECT table_name
          FROM test.information_schema.tables
        WHERE table_schema='public'
          AND table_type='BASE TABLE'`)

      expect(rows).toEqual([{ table_name: "test_creation" }])
    }).pipe(
      withTestEnv("test_creation"),
      Effect.runPromise
    )
  })

  it("Should store the message in the table upon send", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          pipe(
            RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Acknowledged)),
            AtLeastOnce.atLeastOnceRecipientBehaviour
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new SampleMessage({ id: "a", value: 42 })
      yield* _(messenger.sendDiscard("entity1")(msg))

      const sql = yield* _(Pg.client.PgClient)
      const rows = yield* _(sql<{ message_id: string }>`SELECT message_id FROM test_storage`)

      expect(rows.length).toBe(1)
    }).pipe(withTestEnv("test_storage"), Effect.runPromise)
  })

  it("Should mark as processed if message state is processed", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          pipe(
            RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Processed(Exit.void))),
            AtLeastOnce.atLeastOnceRecipientBehaviour
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      const msg = new SampleMessage({ id: "a", value: 42 })
      yield* _(messenger.sendDiscard("entity1")(msg))

      const sql = yield* _(Pg.client.PgClient)
      const rows = yield* _(
        sql<{ message_id: string }>`SELECT message_id FROM test_marked_processed WHERE processed = TRUE`
      )

      expect(rows.length).toBe(1)
    }).pipe(withTestEnv("test_marked_processed"), Effect.runPromise)
  })

  it("Should not mark as processed if message state is acknowledged", () => {
    return Effect.gen(function*(_) {
      yield* _(Sharding.registerScoped)

      yield* _(
        Sharding.registerEntity(
          SampleEntity
        )(
          pipe(
            RecipientBehaviour.fromFunctionEffect(() => Effect.succeed(MessageState.Acknowledged)),
            AtLeastOnce.atLeastOnceRecipientBehaviour
          )
        )
      )

      const messenger = yield* _(Sharding.messenger(SampleEntity))
      yield* _(messenger.sendDiscard("entity1")(new SampleMessage({ id: "a", value: 42 })))

      const sql = yield* _(Pg.client.PgClient)
      const rows = yield* _(
        sql<{ message_id: string }>`SELECT message_id FROM test_acknowledged_unprocessed WHERE processed = FALSE`
      )

      expect(rows.length).toBe(1)
    }).pipe(withTestEnv("test_acknowledged_unprocessed"), Effect.runPromise)
  })
}, { timeout: 60000, sequential: true })
