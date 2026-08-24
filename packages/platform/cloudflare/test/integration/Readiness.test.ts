import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { makeCluster } from "./harness.ts"

const kinds = ["entity", "workflow", "queue", "singleton"] as const

describe("Cloudflare cluster integration | initialization readiness", () => {
  it.effect("holds every cold Durable Object path until registration completes", () =>
    Effect.gen(function*() {
      const cluster = yield* makeCluster
      yield* cluster.fetchJson("/initialization/block")

      const calls = kinds.map((kind) =>
        Effect.runPromise(cluster.fetchJson(`/initialization/call?kind=${kind}`)).then(
          (result) => result,
          (error) => ({ ok: false, error: String(error) })
        )
      )

      yield* cluster.waitUntil(
        "The cold Durable Object calls did not reach the initialization barrier",
        Effect.map(
          cluster.fetchJson("/initialization/state"),
          (state) => state.started && state.callsStarted.length === kinds.length
        )
      )
      const blocked = yield* cluster.fetchJson("/initialization/state")
      assert.deepStrictEqual(
        blocked.callsCompleted,
        [],
        "A Durable Object call completed before application registration"
      )

      yield* cluster.fetchJson("/initialization/open")
      const results = yield* Effect.promise(() => Promise.all(calls))
      const initialized = yield* cluster.fetchJson("/initialization/state")
      assert.isTrue(initialized.completed, "The application initializer did not complete")
      assert.deepStrictEqual(
        results,
        kinds.map(() => ({ ok: true })),
        JSON.stringify(initialized)
      )
    }), 60_000)

  it.effect("holds a cold alarm on the same initialization barrier", () =>
    Effect.gen(function*() {
      const cluster = yield* makeCluster

      yield* cluster.fetchJson("/counter/scheduled?id=readiness-alarm&op=one&offset=3000&discard=true")
      yield* cluster.restart
      yield* cluster.fetchJson("/initialization/block")

      yield* cluster.waitUntil(
        "The cold alarm did not start application initialization",
        Effect.map(cluster.fetchJson("/initialization/state"), (state) => state.started)
      )
      const blocked = yield* cluster.fetchJson("/initialization/state")
      assert.deepStrictEqual(
        blocked.callsStarted,
        [],
        "A Worker request, rather than the alarm, started initialization"
      )

      yield* cluster.fetchJson("/initialization/open")
      yield* cluster.waitUntil(
        "The alarm did not run after application registration completed",
        Effect.map(
          cluster.fetchJson("/state"),
          (state) => (state.deliveries["readiness-alarm"]?.length ?? 0) === 1
        )
      )
    }), 60_000)

  it.effect("propagates one cached initialization failure to every cold caller", () =>
    Effect.gen(function*() {
      const cluster = yield* makeCluster
      yield* cluster.fetchJson("/initialization/fail")

      const results = yield* Effect.promise(() =>
        Promise.all(kinds.map((kind) => Effect.runPromise(cluster.fetchJson(`/initialization/call?kind=${kind}`))))
      )
      for (const result of results) {
        assert.isFalse(result.ok)
        assert.include(result.error, "deliberate Cloudflare application initialization failure")
      }
    }), 60_000)

  it.effect("propagates initialization failure into a cold alarm", () =>
    Effect.gen(function*() {
      const cluster = yield* makeCluster

      yield* cluster.fetchJson("/counter/scheduled?id=readiness-failure&op=one&offset=3000&discard=true")
      yield* cluster.restart
      yield* cluster.fetchJson("/initialization/fail")

      yield* cluster.waitUntil(
        "The cold alarm did not observe the application initialization failure",
        Effect.map(
          cluster.fetchJson("/initialization/state"),
          (state) => state.started && state.failed
        )
      )
      const failed = yield* cluster.fetchJson("/initialization/state")
      assert.deepStrictEqual(
        failed.callsStarted,
        [],
        "A Worker request, rather than the alarm, observed the initialization failure"
      )
    }), 60_000)
})
