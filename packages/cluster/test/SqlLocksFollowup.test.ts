import { RunnerAddress, ShardId, ShardingConfig, SqlRunnerStorage } from "@effect/cluster"
import { SqlClient } from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { assert, it } from "@effect/vitest"
import { Effect, Exit, Layer, Schedule, TestServices } from "effect"
import { PgContainer } from "./fixtures/utils-pg.js"

const address = RunnerAddress.make("localhost", 1234)
const PgLive = PgContainer.ClientLive.pipe(Layer.provideMerge(ShardingConfig.layer()))

it.layer(PgLive, { timeout: 60_000 })("PostgreSQL lock follow-up", (it) => {
  it.effect("recovers when the old reserved query can never resume", () => {
    let partitioned = false
    return Effect.gen(function*() {
      const sql = yield* SqlClient
      let cancelled = 0
      let reservations = 0
      const wrapped = new Proxy(sql, {
        get(target, property, receiver) {
          if (property === "reserve") {
            return Effect.map(target.reserve, (connection) => {
              reservations++
              const gate = <A, E, R>(query: Effect.Effect<A, E, R>) =>
                Effect.suspend(() =>
                  partitioned
                    ? Effect.never.pipe(Effect.onInterrupt(() =>
                      Effect.sync(() => {
                        cancelled++
                      })
                    ))
                    : query
                )
              const wrappedConnection: Connection = {
                ...connection,
                execute: (...args) => gate(connection.execute(...args)),
                executeRaw: (...args) => gate(connection.executeRaw(...args)),
                executeValues: (...args) => gate(connection.executeValues(...args)),
                executeUnprepared: (...args) => gate(connection.executeUnprepared(...args))
              }
              return wrappedConnection
            })
          }
          if (property === "withoutTransforms") return () => wrapped
          return Reflect.get(target, property, receiver)
        }
      })
      const storage = yield* SqlRunnerStorage.make({ prefix: "permanent_partition" }).pipe(
        Effect.provideService(SqlClient, wrapped),
        Effect.provide(ShardingConfig.layer({ shardLockRefreshInterval: 100, shardLockExpiration: 1000 }))
      )
      const shards = [ShardId.make("default", 1)]
      yield* storage.acquire(address, shards)
      partitioned = true
      assert(Exit.isFailure(yield* storage.refresh(address, shards).pipe(Effect.exit)))
      assert.deepStrictEqual(yield* storage.refresh(address, []), [])
      partitioned = false
      const recovered = yield* storage.refresh(address, shards).pipe(
        Effect.retry({ times: 10, schedule: Schedule.spaced(20) }),
        Effect.exit
      )
      assert(Exit.isSuccess(recovered), "reserved connection did not recover after the permanently stalled query")
      assert.deepStrictEqual(recovered.value, shards)
      assert.isAtLeast(cancelled, 1)
      assert.isAtLeast(reservations, 2)
    }).pipe(
      Effect.ensuring(Effect.sync(() => {
        partitioned = false
      })),
      Effect.scoped,
      TestServices.provideLive
    )
  })

  for (
    const [prefix, namespace] of [["cluster", 2839596291], ["other", 4141526711], ["tést_集", 4084497643]] as const
  ) {
    it.effect(`preserves the frozen UTF-8 namespace for ${prefix}`, () =>
      Effect.gen(function*() {
        const storage = yield* SqlRunnerStorage.make({ prefix })
        const sql = yield* SqlClient
        yield* storage.acquire(address, [ShardId.make("default", 1)])
        const rows = yield* sql<{ classid: number; objsubid: number }>`SELECT classid, objsubid FROM pg_locks
        WHERE locktype = 'advisory' AND granted AND objid = 1000001 AND classid = ${namespace}`
        assert.deepStrictEqual(rows.map((r) => [Number(r.classid), Number(r.objsubid)]), [[namespace, 2]])
      }).pipe(Effect.scoped))
  }

  it.effect("ignores foreign locks on its reserved connection and refreshes only requested shards", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient
      const wrapped = new Proxy(sql, {
        get(target, property, receiver) {
          if (property === "reserve") {
            return Effect.tap(
              target.reserve,
              (connection) =>
                connection.executeRaw("SELECT pg_advisory_lock(1000001), pg_advisory_lock(424242, 1000002)", [])
            )
          }
          if (property === "withoutTransforms") return () => wrapped
          return Reflect.get(target, property, receiver)
        }
      })
      const storage = yield* SqlRunnerStorage.make({ prefix: "foreign_followup" }).pipe(
        Effect.provideService(SqlClient, wrapped)
      )
      const shards = [1, 2, 3].map((id) => ShardId.make("default", id))
      assert.deepStrictEqual(yield* storage.acquire(address, shards), shards)
      assert.deepStrictEqual(yield* storage.acquire(address, [shards[1]]), [shards[1]])
      assert.deepStrictEqual(yield* storage.refresh(address, [shards[2]]), [shards[2]])
      yield* storage.release(address, shards[0])
      const foreign = yield* sql`SELECT objsubid FROM pg_locks WHERE locktype = 'advisory' AND granted
      AND ((classid = 0 AND objid = 1000001 AND objsubid = 1) OR (classid = 424242 AND objid = 1000002 AND objsubid = 2))`
      assert.strictEqual(foreign.length, 2, "releasing a shard must preserve unrelated locks")
    }).pipe(Effect.scoped))
})
