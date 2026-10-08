import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { makeCluster } from "./harness.ts"

// After a restart nothing in these tests messages the entity before the
// recovery is observed: the entity Durable Object has to wake on its own.
describe("Cloudflare cluster integration | Recovery", () => {
  it.effect("rebuilds an entity holding keepAlive after an isolate restart", () =>
    Effect.gen(function*() {
      const cluster = yield* makeCluster

      yield* cluster.fetchJson("/pinned/pin?id=recover")
      yield* cluster.waitUntil(
        "Entity.keepAlive(true) did not establish a hold on the entity Durable Object",
        Effect.map(cluster.fetchJson("/holds?type=Pinned&id=recover"), (result) => result.holds === 1)
      )

      yield* cluster.restart

      yield* cluster.waitUntil(
        "The keep-alive entity was not rebuilt after the isolate restart",
        Effect.map(cluster.fetchJson("/state"), (state) => (state.builds["Pinned/recover"] ?? 0) === 1)
      )
      yield* cluster.waitUntil(
        "The rebuilt keep-alive entity did not hold its Durable Object again",
        Effect.map(cluster.fetchJson("/holds?type=Pinned&id=recover"), (result) => result.holds === 1)
      )

      // Releasing keep-alive ends the recovery: the next restart leaves the
      // entity cold.
      yield* cluster.fetchJson("/pinned/unpin?id=recover")
      yield* cluster.waitUntil(
        "Releasing keepAlive did not unpin the entity Durable Object",
        Effect.map(cluster.fetchJson("/holds?type=Pinned&id=recover"), (result) => result.holds === 0)
      )
      yield* cluster.restart
      yield* Effect.sleep("2 seconds")
      const state = yield* cluster.fetchJson("/state")
      assert.isUndefined(
        state.builds["Pinned/recover"],
        "The entity was rebuilt after a restart although it had released keepAlive"
      )
    }), 60_000)

  it.effect(
    "replays an unprocessed persisted tell after an isolate restart without new contact",
    () =>
      Effect.gen(function*() {
        const cluster = yield* makeCluster

        yield* cluster.fetchJson("/blocker/hold?id=cold-replay&op=first")
        yield* cluster.waitUntil(
          "The persisted Hold request did not start before the restart",
          Effect.map(cluster.fetchJson("/state"), (state) => (state.entered["cold-replay/first"] ?? 0) === 1)
        )

        yield* cluster.restart

        // Module state is wiped by the restart, so an entry here can only come
        // from the entity Durable Object replaying its unprocessed row.
        yield* cluster.waitUntil(
          "The unprocessed persisted tell was not replayed after the isolate restart",
          Effect.map(cluster.fetchJson("/state"), (state) => (state.entered["cold-replay/first"] ?? 0) === 1)
        )
        yield* cluster.fetchJson("/blocker/open?id=cold-replay&op=first")
        yield* cluster.waitUntil(
          "The replayed Hold request did not run to completion",
          Effect.map(cluster.fetchJson("/state"), (state) => (state.completed["cold-replay/first"] ?? 0) === 1)
        )
        const read = yield* cluster.fetchJson("/blocker/get?id=cold-replay")
        assert.strictEqual(read.value, 1, "The replayed request did not update entity state exactly once")
      }),
    60_000
  )
})
