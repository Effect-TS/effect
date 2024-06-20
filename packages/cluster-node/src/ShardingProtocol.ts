/**
 * @since 1.0.0
 */
import * as MessageState from "@effect/cluster/MessageState"
import * as SerializedEnvelope from "@effect/cluster/SerializedEnvelope"
import * as SerializedMessage from "@effect/cluster/SerializedMessage"
import * as ShardId from "@effect/cluster/ShardId"
import * as ShardingException from "@effect/cluster/ShardingException"
import * as Schema from "@effect/schema/Schema"

/**
 * @since 1.0.0
 * @category schema
 */
export class AssignShards extends Schema.TaggedRequest<AssignShards>()(
  "@effect/cluster-node/ShardingProtocol/AssignShards",
  Schema.Never,
  Schema.Void,
  {
    shards: Schema.HashSet(ShardId.schema)
  }
) {
}

/**
 * @since 1.0.0
 * @category schema
 */
export class UnassignShards extends Schema.TaggedRequest<UnassignShards>()(
  "@effect/cluster-node/ShardingProtocol/UnassignShards",
  Schema.Never,
  Schema.Void,
  {
    shards: Schema.HashSet(ShardId.schema)
  }
) {
}

/**
 * @since 1.0.0
 * @category schema
 */
export class Send extends Schema.TaggedRequest<Send>()(
  "@effect/cluster-node/ShardingProtocol/Send",
  ShardingException.schema,
  MessageState.schema(SerializedMessage.schema),
  {
    envelope: SerializedEnvelope.schema
  }
) {}

/**
 * @since 1.0.0
 * @category schema
 */
export class PingShard extends Schema.TaggedRequest<PingShard>()(
  "@effect/cluster-node/ShardingProtocol/PingShard",
  Schema.Never,
  Schema.Boolean,
  {}
) {}
