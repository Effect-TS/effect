/**
 * @since 1.0.0
 */
import * as MessageState from "@effect/cluster/MessageState"
import * as SerializedEnvelope from "@effect/cluster/SerializedEnvelope"
import * as SerializedMessage from "@effect/cluster/SerializedMessage"
import * as ShardId from "@effect/cluster/ShardId"
import * as ShardingException from "@effect/cluster/ShardingException"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category schema
 */
export class AssignShards extends Schema.TaggedRequest<AssignShards>()(
  "@effect/cluster-node/ShardingProtocol/AssignShards",
  {
    failure: Schema.Never,
    success: Schema.Void,
    payload: {
      shards: Schema.HashSet(ShardId.schema)
    }
  }
) {
}

/**
 * @since 1.0.0
 * @category schema
 */
export class UnassignShards extends Schema.TaggedRequest<UnassignShards>()(
  "@effect/cluster-node/ShardingProtocol/UnassignShards",
  {
    failure: Schema.Never,
    success: Schema.Void,
    payload: {
      shards: Schema.HashSet(ShardId.schema)
    }
  }
) {
}

/**
 * @since 1.0.0
 * @category schema
 */
export class Send extends Schema.TaggedRequest<Send>()(
  "@effect/cluster-node/ShardingProtocol/Send",
  {
    failure: ShardingException.schema,
    success: MessageState.schema(SerializedMessage.schema),
    payload: {
      envelope: SerializedEnvelope.schema
    }
  }
) {}

/**
 * @since 1.0.0
 * @category schema
 */
export class PingShard extends Schema.TaggedRequest<PingShard>()(
  "@effect/cluster-node/ShardingProtocol/PingShard",
  { failure: Schema.Never, success: Schema.Boolean, payload: {} }
) {}
