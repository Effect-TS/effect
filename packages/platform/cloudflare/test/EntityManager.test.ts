import type { DurableObjectStorage, SqlStorage } from "@cloudflare/workers-types"
import { makeEntityKeepAlive } from "@effect/platform-cloudflare/internal/entityKeepAlive"
import { loadNextReply } from "@effect/platform-cloudflare/internal/entityMailbox"
import { registerEntity, unregisterEntity } from "@effect/platform-cloudflare/internal/entityRegistry"
import type { EntityRegistration } from "@effect/platform-cloudflare/internal/entityRegistry"
import { makeEntityManager } from "@effect/platform-cloudflare/internal/entityRuntime"
import { ensureEntityStorage } from "@effect/platform-cloudflare/internal/entityStorage"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Schema, Stream } from "effect"
import { ClusterSchema, Entity, EntityAddress, EntityId, EntityType, ShardId } from "effect/unstable/cluster"
import { Rpc, RpcSchema } from "effect/unstable/rpc"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"

class SqliteStorage {
  readonly sql: SqlStorage

  constructor(readonly database: DatabaseSync) {
    this.sql = {
      exec: (query: string, ...bindings: Array<unknown>) => {
        const rows = database.prepare(query).all(...bindings as Array<SQLInputValue>) as Array<Record<string, unknown>>
        return { toArray: () => rows }
      }
    } as SqlStorage
  }

  transactionSync<A>(f: () => A): A {
    this.database.exec("BEGIN")
    try {
      const value = f()
      this.database.exec("COMMIT")
      return value
    } catch (error) {
      this.database.exec("ROLLBACK")
      throw error
    }
  }
}

const InterruptedStream = Entity.make("InterruptedStream", [
  Rpc.make("Watch", {
    success: RpcSchema.Stream(Schema.Number, Schema.Never)
  }).annotate(ClusterSchema.Persisted, true),
  Rpc.make("Ping", { success: Schema.String })
])

const address = EntityAddress.make({
  shardId: ShardId.make("default", 1),
  entityType: EntityType.make(InterruptedStream.type),
  entityId: EntityId.make("one")
})

const request = (requestId: string, tag: "Watch" | "Ping") =>
  JSON.stringify({
    _tag: "Request",
    requestId,
    address,
    tag,
    payload: null,
    headers: {}
  })

describe("EntityManager", () => {
  it.effect("completes an interrupted persisted stream instead of replaying it", () =>
    Effect.gen(function*() {
      const database = yield* Effect.acquireRelease(
        Effect.sync(() => new DatabaseSync(":memory:")),
        (database) => Effect.sync(() => database.close())
      )
      const storage = new SqliteStorage(database)
      ensureEntityStorage(storage.sql)

      let streamRuns = 0
      const registration: EntityRegistration = {
        entity: InterruptedStream,
        build: Effect.succeed(InterruptedStream.of({
          Watch: () => {
            streamRuns++
            return Stream.fromIterable([1, 2]).pipe(Stream.rechunk(1))
          },
          Ping: () => Effect.succeed("pong")
        })),
        options: undefined,
        context: Context.empty()
      }
      assert.isTrue(registerEntity(InterruptedStream.type, registration))
      yield* Effect.addFinalizer(() => Effect.sync(() => unregisterEntity(InterruptedStream.type, registration)))

      const waitUntilFibers: Array<{ readonly pollUnsafe: () => unknown | undefined }> = []
      const manager = makeEntityManager({
        storage: storage as unknown as DurableObjectStorage,
        address,
        entityName: "17:InterruptedStreamone",
        keepAlive: makeEntityKeepAlive(() => Promise.resolve()),
        waitUntil: (effect) => {
          waitUntilFibers.push(Effect.runFork(effect))
        },
        getNamespace: () => undefined
      })
      const streamRequestId = "0198bd72-6a80-72f1-8d87-5e9b5cf1e000"
      const first = yield* manager.invoke(request(streamRequestId, "Watch"), false)
      assert.strictEqual(first._tag, "Success")
      assert.strictEqual(first._tag === "Success" ? JSON.parse(first.replies[0])._tag : undefined, "Chunk")

      yield* manager.interrupt(streamRequestId)
      const ping = yield* manager.invoke(
        request("0198bd72-6a81-72f1-8d87-5e9b5cf1e001", "Ping"),
        false
      )
      yield* Effect.yieldNow

      assert.strictEqual(ping._tag, "Success")
      assert.strictEqual(streamRuns, 1)
      assert.isTrue(waitUntilFibers.every((fiber) => fiber.pollUnsafe() !== undefined))

      const row = storage.sql.exec(
        "SELECT processed FROM cluster_messages WHERE request_id = ?",
        streamRequestId
      ).toArray()[0]
      assert.strictEqual(row.processed, 1)
      assert.strictEqual(loadNextReply(storage.sql, streamRequestId)?.kind, "WithExit")
      assert.strictEqual(
        storage.sql.exec(
          "SELECT COUNT(*) AS count FROM cluster_replies WHERE request_id = ? AND kind = 'Chunk' AND acked = 0",
          streamRequestId
        ).toArray()[0].count,
        0
      )
    }))
})
