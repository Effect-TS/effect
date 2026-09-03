import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { Runner, RunnerAddress, ShardId, ShardingConfig, SqlRunnerStorage } from "effect/unstable/cluster"
import { SqlClient } from "effect/unstable/sql"
import { PgContainer } from "../fixtures/pg-utils.ts"

const one = ShardId.make("default", 1)
const two = ShardId.make("default", 2)
const addressA = RunnerAddress.make("localhost", 41001)
const addressB = RunnerAddress.make("localhost", 41002)

const labels = (shards: ReadonlyArray<ShardId.ShardId>) => shards.map(String).sort()
const assertShards = (actual: ReadonlyArray<ShardId.ShardId>, expected: ReadonlyArray<ShardId.ShardId>) =>
  assert.deepStrictEqual(labels(actual), labels(expected))

const makeStorages = (prefix: string, shardLockDisableAdvisory = false) =>
  Effect.gen(function*() {
    const a = yield* SqlRunnerStorage.make({ prefix })
    const b = yield* SqlRunnerStorage.make({ prefix })
    yield* a.register(Runner.make({ address: addressA, groups: ["default"], weight: 1 }), true)
    yield* b.register(Runner.make({ address: addressB, groups: ["default"], weight: 1 }), true)
    return { a, b }
  }).pipe(Effect.provide(ShardingConfig.layer({ shardsPerGroup: 2, shardLockDisableAdvisory })))

// Each test has its own prefix and storage scope. The shared PostgreSQL client
// outlives those scopes, so reserved connections close before the pool does.
describe.sequential("SqlRunnerStorage requested PostgreSQL shards", () => {
  it.layer(PgContainer.layerClient, { timeout: 60_000, excludeTestServices: true })((it) => {
    for (const shardLockDisableAdvisory of [false, true]) {
      const backend = shardLockDisableAdvisory ? "row" : "advisory"
      const fixture = (name: string) => makeStorages(`requested_${backend}_${name}`, shardLockDisableAdvisory)

      describe(backend, () => {
        it.effect("returns the first requested shard", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("first")
            assertShards(yield* a.acquire(addressA, [one]), [one])
          }))

        it.effect("returns only a disjoint request, not previously held shards", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("disjoint")
            yield* a.acquire(addressA, [one])
            assertShards(yield* a.acquire(addressA, [two]), [two])
          }))

        it.effect("returns only the requested subset of held shards", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("held_subset")
            yield* a.acquire(addressA, [one, two])
            assertShards(yield* a.acquire(addressA, [one]), [one])
          }))

        it.effect("refreshes only the requested nonempty subset", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("refresh_subset")
            yield* a.acquire(addressA, [one, two])
            assertShards(yield* a.refresh(addressA, [two]), [two])
          }))

        it.effect("returns all requested held shards", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("all_held")
            yield* a.acquire(addressA, [one, two])
            assertShards(yield* a.acquire(addressA, [one, two]), [one, two])
          }))

        // Ownership controls do not assert the owner's narrowed result: they
        // must still execute if result filtering regresses.
        it.effect("keeps an unrequested shard locked after disjoint acquisition", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("disjoint_keeps_lock")
            yield* a.acquire(addressA, [one])
            yield* a.acquire(addressA, [two])
            assertShards(yield* b.acquire(addressB, [one]), [])
          }))

        it.effect("keeps an unrequested shard locked after refresh", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("refresh_keeps_lock")
            yield* a.acquire(addressA, [one, two])
            yield* a.refresh(addressA, [two])
            assertShards(yield* b.acquire(addressB, [one]), [])
          }))

        it.effect("returns no shards for empty public acquisition", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("empty")
            yield* a.acquire(addressA, [one, two])
            assertShards(yield* a.acquire(addressA, []), [])
          }))

        it.effect("keeps held shards locked after empty public acquisition", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("empty_keeps_locks")
            yield* a.acquire(addressA, [one, two])
            yield* a.acquire(addressA, [])
            assertShards(yield* b.acquire(addressB, [one, two]), [])
          }))

        it.effect("bounds every repeated held acquisition to the requested subset", () =>
          Effect.gen(function*() {
            const { a } = yield* fixture("repeated")
            yield* a.acquire(addressA, [one, two])
            const results: Array<Array<string>> = []
            for (let i = 0; i < 8; i++) {
              results.push(labels(yield* a.acquire(addressA, [one])))
            }
            assert.deepStrictEqual(results, Array.from({ length: 8 }, () => labels([one])))
          }))

        it.effect("one release after repeated acquisition transfers only that shard", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("single_release")
            yield* a.acquire(addressA, [one])
            yield* a.acquire(addressA, [two])
            for (let i = 0; i < 8; i++) {
              yield* a.acquire(addressA, [one])
            }
            yield* a.release(addressA, one)
            assertShards(yield* b.acquire(addressB, [one]), [one])
            assertShards(yield* b.acquire(addressB, [one, two]), [one])
          }))

        it.effect("releases the other shard independently", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("release_second")
            yield* a.acquire(addressA, [one, two])
            yield* a.release(addressA, one)
            yield* b.acquire(addressB, [one])
            yield* a.release(addressA, two)
            assertShards(yield* b.acquire(addressB, [one, two]), [one, two])
          }))

        it.effect("releaseAll makes both shards available to another storage", () =>
          Effect.gen(function*() {
            const { a, b } = yield* fixture("release_all")
            yield* b.acquire(addressB, [one, two])
            yield* b.releaseAll(addressB)
            assertShards(yield* a.acquire(addressA, [one, two]), [one, two])
          }))
      })
    }

    it.effect("advisory acquisition combines held and new requested shards", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_overlap")
        assertShards(yield* a.acquire(addressA, [one]), [one])
        assertShards(yield* a.acquire(addressA, [one, two]), [one, two])
      }))

    it.effect("advisory acquisition narrows after a held and new overlap", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_overlap_narrow")
        yield* a.acquire(addressA, [one])
        yield* a.acquire(addressA, [one, two])
        assertShards(yield* a.acquire(addressA, [two]), [two])
      }))

    it.effect("advisory acquisition coalesces duplicate held requests without unrelated shards", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_duplicates_held")
        yield* a.acquire(addressA, [one, two])
        assertShards(yield* a.acquire(addressA, [two, two]), [two])
      }))

    it.effect("advisory acquisition coalesces duplicate fresh requests", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_duplicates_fresh")
        assertShards(yield* a.acquire(addressA, [two, two]), [two])
      }))

    it.effect("one release makes a duplicate advisory request available to another storage", () =>
      Effect.gen(function*() {
        const { a, b } = yield* makeStorages("requested_duplicates_release")
        yield* a.acquire(addressA, [two, two])
        yield* a.release(addressA, two)
        assertShards(yield* b.acquire(addressB, [two]), [two])
      }))

    it.effect("a separate prefix acquires the same advisory shard independently", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_prefix_same_a")
        const { a: d } = yield* makeStorages("requested_prefix_same_d")
        yield* a.acquire(addressA, [one, two])
        assertShards(yield* d.acquire(addressA, [one]), [one])
      }))

    it.effect("a separate prefix also returns only a disjoint advisory request", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_prefix_disjoint_a")
        const { a: d } = yield* makeStorages("requested_prefix_disjoint_d")
        yield* a.acquire(addressA, [one, two])
        yield* d.acquire(addressA, [one])
        assertShards(yield* d.acquire(addressA, [two]), [two])
      }))

    it.effect("a separate prefix also refreshes only its requested advisory subset", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_prefix_refresh_a")
        const { a: d } = yield* makeStorages("requested_prefix_refresh_d")
        yield* a.acquire(addressA, [one, two])
        yield* d.acquire(addressA, [one, two])
        assertShards(yield* d.refresh(addressA, [one]), [one])
      }))

    it.effect("a separate prefix does not change exclusion in the original prefix", () =>
      Effect.gen(function*() {
        const { a, b } = yield* makeStorages("requested_prefix_exclusion_a")
        const { a: d } = yield* makeStorages("requested_prefix_exclusion_d")
        yield* a.acquire(addressA, [one, two])
        yield* d.acquire(addressA, [one, two])
        assertShards(yield* b.acquire(addressB, [one, two]), [])
      }))

    it.effect("releasing a separate prefix does not release the original advisory locks", () =>
      Effect.gen(function*() {
        const { a, b } = yield* makeStorages("requested_prefix_release_a")
        const { a: d } = yield* makeStorages("requested_prefix_release_d")
        yield* a.acquire(addressA, [one, two])
        yield* d.acquire(addressA, [one, two])
        yield* d.releaseAll(addressA)
        assertShards(yield* b.acquire(addressB, [one, two]), [])
      }))

    it.effect("PostgreSQL row locking does not take advisory locks", () =>
      Effect.gen(function*() {
        const { a } = yield* makeStorages("requested_row_inventory", true)
        const sql = yield* SqlClient.SqlClient
        yield* a.acquire(addressA, [one, two])
        yield* a.refresh(addressA, [two])
        assert.deepStrictEqual(
          yield* sql`
            SELECT objid FROM pg_locks
            WHERE locktype = 'advisory'
              AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
          `,
          []
        )
      }))
  })
})
