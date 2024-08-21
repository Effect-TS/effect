import { EntityAddress } from "@effect/cluster/EntityAddress"
import { EntityId } from "@effect/cluster/EntityId"
import { EntityType } from "@effect/cluster/EntityType"
import * as Envelope from "@effect/cluster/Envelope"
import { ShardId } from "@effect/cluster/ShardId"
import * as Schema from "@effect/schema/Schema"
import * as Serializable from "@effect/schema/Serializable"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as PrimaryKey from "effect/PrimaryKey"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()("SampleMessage", {
  success: Schema.String,
  failure: Schema.Number,
  payload: { id: Schema.Number, name: Schema.String }
}) {
  [PrimaryKey.symbol](): string {
    return this.id.toString()
  }
}

describe("Envelope", () => {
  it.effect("should serialize an Envelope", () =>
    Effect.gen(function*() {
      const shardId = ShardId.make(1)
      const entityType = EntityType.make("User")
      const entityId = EntityId.make("1")
      const address = EntityAddress.make({ shardId, entityType, entityId })
      const message = new SampleMessage({ id: 1, name: "sample-1" })
      const envelope = Envelope.make(address, message)
      const serialized = yield* Serializable.serialize(envelope)
      expect(serialized).toEqual({
        address: { shardId: 1, entityType: "User", entityId: "1" },
        message: { _tag: "SampleMessage", id: 1, name: "sample-1" }
      })
    }))

  it.effect("should deserialize an Envelope", () =>
    Effect.gen(function*() {
      const shardId = ShardId.make(1)
      const entityType = EntityType.make("User")
      const entityId = EntityId.make("1")
      const address = EntityAddress.make({ shardId, entityType, entityId })
      const message = new SampleMessage({ id: 1, name: "sample-1" })
      const envelope = Envelope.make(address, message)
      const deserialized = yield* Serializable.deserialize(envelope, {
        address: { shardId: 1, entityType: "User", entityId: "1" },
        message: { _tag: "SampleMessage", id: 1, name: "sample-1" }
      })
      expect(deserialized).toEqual(Envelope.make(address, message))
    }))
})
