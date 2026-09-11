import { ClusterError, Entity, EntityAddress, EntityId, EntityProxy, EntityType, ShardId } from "@effect/cluster"
import { Rpc } from "@effect/rpc"
import { assert, it } from "@effect/vitest"
import { Effect, Schema } from "effect"

const entity = Entity.make("ProxyFollowup", [Rpc.make("Read", { success: Schema.String, error: Schema.String })])
const error = new ClusterError.EntityNotAssignedToRunner({
  address: EntityAddress.make({
    shardId: ShardId.make("default", 1),
    entityType: EntityType.EntityType.make(entity.type),
    entityId: EntityId.make("one")
  })
})

for (const transport of ["rpc", "http"] as const) {
  it.effect(`${transport} request proxy encodes routing errors and discard rejects them`, () =>
    Effect.gen(function*() {
      const schemas = transport === "rpc"
        ? Array.from(EntityProxy.toRpcGroup(entity).requests.values(), (rpc) => rpc.errorSchema)
        : Object.values(EntityProxy.toHttpApiGroup("proxy", entity).endpoints).map((endpoint) => endpoint.errorSchema)
      const request = schemas[0] as Schema.Schema.AnyNoContext
      const discard = schemas[1] as Schema.Schema.AnyNoContext
      const encoded = yield* Schema.encode(request)(error)
      assert.deepStrictEqual(yield* Schema.decodeUnknown(request)(encoded), error)
      assert.isFalse(Schema.is(discard)(error))
      assert.isTrue(Schema.is(request)("domain error"))
      assert.isFalse(Schema.is(discard)("domain error"))
    }))
}
