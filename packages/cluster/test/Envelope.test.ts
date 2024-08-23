import { EntityAddress } from "@effect/cluster/EntityAddress"
import { EntityId } from "@effect/cluster/EntityId"
import { EntityType } from "@effect/cluster/EntityType"
import * as Envelope from "@effect/cluster/Envelope"
import { ShardId } from "@effect/cluster/ShardId"
import * as Schema from "@effect/schema/Schema"
import { describe, expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as PrimaryKey from "effect/PrimaryKey"

class SampleMessage extends Schema.TaggedRequest<SampleMessage>()("SampleMessage", {
  success: Schema.String,
  failure: Schema.Number,
  payload: {
    id: Schema.Number,
    name: Schema.String,
    date: Schema.Date
  }
}) {
  [PrimaryKey.symbol](): string {
    return this.id.toString()
  }
}

describe("Envelope", () => {
  it.effect("should serialize an Envelope", () =>
    Effect.gen(function*() {
      const date = new Date()
      const shardId = ShardId.make(1)
      const entityType = EntityType.make("User")
      const entityId = EntityId.make("1")
      const address = EntityAddress.make({ shardId, entityType, entityId })
      const message = new SampleMessage({ id: 1, name: "sample-1", date })
      const envelope = Envelope.make(address, message)
      const serialized = yield* Envelope.serialize(envelope)
      expect(serialized).toEqual({
        address: { shardId: 1, entityType: "User", entityId: "1" },
        message: { _tag: "SampleMessage", id: 1, name: "sample-1", date: date.toISOString() }
      })
    }))
})
