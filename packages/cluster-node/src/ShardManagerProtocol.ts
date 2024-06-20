/**
 * @since 1.0.0
 */
import * as Pod from "@effect/cluster/Pod"
import * as PodAddress from "@effect/cluster/PodAddress"
import * as ShardId from "@effect/cluster/ShardId"
import * as Schema from "@effect/schema/Schema"

/**
 * @since 1.0.0
 * @category schema
 */
export class Register extends Schema.TaggedRequest<Register>()(
  "@effect/cluster-node/ShardManagerProtocolRpc/Register",
  Schema.Never,
  Schema.Void,
  {
    pod: Pod.schema
  }
) {}

/**
 * @since 1.0.0
 * @category schema
 */
export class Unregister extends Schema.TaggedRequest<Unregister>()(
  "@effect/cluster-node/ShardManagerProtocolRpc/Unregister",
  Schema.Never,
  Schema.Void,
  {
    podAddress: PodAddress.schema
  }
) {}

/**
 * @since 1.0.0
 * @category schema
 */
export class NotifyUnhealthyPod extends Schema.TaggedRequest<NotifyUnhealthyPod>()(
  "@effect/cluster-node/ShardManagerProtocolRpc/NotifyUnhealthyPod",
  Schema.Never,
  Schema.Void,
  {
    podAddress: PodAddress.schema
  }
) {}

/**
 * @since 1.0.0
 * @category schema
 */
export class GetAssignements extends Schema.TaggedRequest<GetAssignements>()(
  "@effect/cluster-node/ShardManagerProtocolRpc/GetAssignements",
  Schema.Never,
  Schema.HashMap({
    key: ShardId.schema,
    value: Schema.Option(PodAddress.schema)
  }),
  {}
) {}
