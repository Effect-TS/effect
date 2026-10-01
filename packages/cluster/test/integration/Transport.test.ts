import { ClusterSchema, Entity } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, PrimaryKey, Schema } from "effect"
import { type Backend, make } from "./harness.js"

class Request extends Schema.Class<Request>("ClusterTransportRequest")({ id: Schema.String }) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}
const TransportEntity = Entity.make("ClusterIntegrationTransport", [
  Rpc.make("Persisted", { payload: Request, success: Schema.String }),
  Rpc.make("Volatile", { payload: Request, success: Schema.String }).annotate(ClusterSchema.Persisted, false)
]).annotateRpcs(ClusterSchema.Persisted, true)

describe("cluster transport integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.scopedLive(`${backend}: treats a directional socket cut as RunnerUnavailable for volatile and recovers persisted`, () =>
      Effect.gen(function*() {
        const volatileEntered = yield* Effect.makeLatch(), volatileGate = yield* Effect.makeLatch()
        const persistedEntered = yield* Effect.makeLatch(), persistedGate = yield* Effect.makeLatch()
        let volatileAttempts = 0, persistedAttempts = 0
        const entities = TransportEntity.toLayer({
          Persisted: Effect.fnUntraced(function*({ payload }) {
            persistedAttempts++
            yield* persistedEntered.open
            yield* persistedGate.await
            return `persisted:${payload.id}`
          }),
          Volatile: Effect.fnUntraced(function*({ payload }) {
            volatileAttempts++
            yield* volatileEntered.open
            yield* volatileGate.await
            return `volatile:${payload.id}`
          })
        })
        const cluster = yield* make({ backend, entities, trackSockets: true })
        const [runner] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()
        const client = yield* cluster.getClient(TransportEntity)
        const volatile = yield* client("volatile").Volatile(new Request({ id: `${backend}-volatile` })).pipe(
          Effect.forkScoped
        )
        const persisted = yield* client("persisted").Persisted(new Request({ id: `${backend}-persisted` })).pipe(
          Effect.forkScoped
        )
        yield* cluster.waitUntil(
          "The volatile request did not enter the runner before the socket cut",
          Effect.as(volatileEntered.await, true)
        )
        yield* cluster.waitUntil(
          "The persisted request did not enter the runner before the socket cut",
          Effect.as(persistedEntered.await, true)
        )
        yield* cluster.cutSocket(runner, { peer: "client", direction: "inbound" })
        yield* volatileGate.open
        yield* persistedGate.open
        assert.strictEqual(yield* Fiber.join(volatile), `volatile:${backend}-volatile`)
        assert.strictEqual(yield* Fiber.join(persisted), `persisted:${backend}-persisted`)
        assert.strictEqual(runner.state(), "running")
        assert.strictEqual(volatileAttempts, 2)
        assert.strictEqual(persistedAttempts, 1)
      }))
  }
})
