import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import { RunnerAddress, ShardId, ShardingConfig, SqlRunnerStorage } from "effect/cluster"
import { SqlClient } from "effect/sql"
import { TestClock } from "effect/testing"
import { PgContainer } from "../fixtures/pg-utils.ts"

it.effect("orders PostgreSQL lease locks across acquisition, refresh and bulk release", () =>
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient
    const first = yield* SqlRunnerStorage.make({ prefix: "lease_order" })
    const second = yield* SqlRunnerStorage.make({ prefix: "lease_order" })
    const a = RunnerAddress.make("worker-a", 8080)
    const b = RunnerAddress.make("worker-b", 8080)
    const shards = Array.from({ length: 12 }, (_, i) => ShardId.make("default", i + 1))
    // Widen the overlap between conflicting statements without relying on a worker sleep.
    yield* sql`CREATE FUNCTION lease_order_delay() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN PERFORM pg_sleep(0.003); RETURN NEW; END $$`
    yield* sql`CREATE TRIGGER lease_delay BEFORE UPDATE ON lease_order_locks
      FOR EACH ROW EXECUTE FUNCTION lease_order_delay()`
    assert.lengthOf(yield* first.acquire(a, shards), shards.length)
    assert.deepEqual(yield* second.acquire(b, shards), [])
    for (let i = 0; i < 8; i++) {
      yield* first.releaseAll(a)
      yield* second.releaseAll(b)
      yield* first.acquire(a, shards)
      yield* sql`UPDATE lease_order_locks SET acquired_at = NOW() - INTERVAL '2 hours'`
      yield* Effect.all([
        first.refresh(a, [...shards].reverse()),
        second.acquire(b, shards)
      ], { concurrency: 2 })
      const rows = yield* sql<{ shard_id: string; address: string }>`
        SELECT shard_id, address FROM lease_order_locks`
      assert.lengthOf(rows, shards.length)
      assert.strictEqual(new Set(rows.map((row) => row.address)).size, 1)
      const owner = rows[0].address === "worker-a:8080" ? a : b
      const outsider = owner === a ? b : a
      assert.deepEqual(yield* second.acquire(outsider, shards), [])
      yield* second.release(outsider, shards[0])
      assert.lengthOf(yield* first.refresh(owner, shards), shards.length)
      yield* Effect.all([
        first.releaseAll(owner),
        second.acquire(outsider, [...shards].reverse())
      ], { concurrency: 2 })
    }
  }).pipe(
    Effect.scoped,
    Effect.provide(PgContainer.layerClient),
    Effect.provide(ShardingConfig.layer({
      shardLockDisableAdvisory: true,
      shardLockExpiration: "1 hour",
      shardLockRefreshInterval: 10_000
    })),
    TestClock.withLive
  ), 60_000)
