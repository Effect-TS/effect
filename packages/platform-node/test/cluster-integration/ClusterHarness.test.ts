import { assert, describe, it } from "@effect/vitest"
import { Effect, PrimaryKey, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/unstable/cluster"
import { Rpc } from "effect/unstable/rpc"
import { make } from "./ClusterHarness.ts"

class Ping extends Schema.Class<Ping>("Ping")({
  id: Schema.String
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const TestEntity = Entity.make("ClusterIntegrationTestEntity", [
  Rpc.make("Ping", {
    payload: Ping,
    success: Schema.String
  })
]).annotateRpcs(ClusterSchema.Persisted, true)

const TestEntityLayer = TestEntity.toLayer({
  Ping: ({ payload }) => Effect.succeed(`pong:${payload.id}`)
})

describe("ClusterHarness", () => {
  it.live("runs a persisted entity message on a real multi-runner cluster", () =>
    Effect.gen(function*() {
      const harness = yield* make(TestEntityLayer)
      yield* harness.start(2)

      const client = yield* harness.getClient(TestEntity)
      const result = yield* client("entity-1").Ping(new Ping({ id: "request-1" }))

      assert.strictEqual(result, "pong:request-1")
    }).pipe(Effect.scoped), 120_000)
})
