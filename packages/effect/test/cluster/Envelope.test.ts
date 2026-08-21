import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { EntityAddress, EntityId, EntityType, Envelope, ShardId, Snowflake } from "effect/unstable/cluster"
import { Headers } from "effect/unstable/http"

const request = {
  _tag: "Request",
  requestId: Snowflake.Snowflake(BigInt(1)),
  address: EntityAddress.make({
    shardId: ShardId.make("default", 1),
    entityType: EntityType.make("TestEntity"),
    entityId: EntityId.make("1")
  }),
  tag: "Test",
  payload: { id: 1 },
  headers: Headers.empty
} as Envelope.PartialRequest

describe("Envelope.OpaqueHole", () => {
  it("leaves the already-encoded payload untouched under the JSON codec", () => {
    const encoded = Schema.encodeSync(Envelope.PartialJson)(request) as Envelope.PartialRequestEncoded
    assert.deepStrictEqual(encoded.payload, { id: 1 })

    const decoded = Schema.decodeSync(Envelope.PartialJson)(encoded)
    assert.strictEqual(decoded._tag, "Request")
    assert.deepStrictEqual((decoded as Envelope.PartialRequest).payload, { id: 1 })
  })

  it("carries a non-JSON payload through the hole", () => {
    const bytes = Uint8Array.of(1, 2, 3)
    const encoded = Schema.encodeSync(Envelope.PartialJson)(
      { ...request, payload: bytes } as Envelope.PartialRequest
    ) as Envelope.PartialRequestEncoded
    assert.strictEqual(encoded.payload, bytes)
  })
})
