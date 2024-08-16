/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { Option } from "effect/Option"
import type { Stream } from "effect/Stream"
import type { EntityAddress } from "./EntityAddress.js"
import type { Envelope } from "./Envelope.js"
import type { MessageState } from "./MessageState.js"
import type { Pod } from "./Pod.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardId } from "./ShardId.js"

/**
 * Represents a generic interface to the persistent storage required by the
 * cluster.
 *
 * @since 1.0.0
 * @category models
 */
export class Storage extends Context.Tag("@effect/cluster/Storage")<Storage, {
  /**
   * Save the provided message and its associated metadata.
   *
   * @returns `true` if the message was saved successfully, `false` otherwise
   */
  readonly saveMessage: (envelope: Envelope) => Effect<boolean>
  /**
   * Updates the specified message using the provided `MessageState`.
   */
  readonly updateMessage: <Msg extends Envelope.AnyMessage>(
    address: EntityAddress,
    message: Msg,
    state: MessageState<WithResult.Success<Msg>, WithResult.Failure<Msg>>
  ) => Effect<void>
  /**
   * Get the current assignments of shards to pods.
   */
  readonly getShardAssignments: Effect<HashMap<ShardId, Option<PodAddress>>>
  /**
   * Returns a `Stream` which will emit the state of all shard assignments
   * whenever assignments are updated.
   */
  readonly streamShardAssignments: Stream<HashMap<ShardId, Option<PodAddress>>>
  /**
   * Save the current state of shards assignments to pods.
   */
  readonly saveShardAssignments: (assignments: HashMap<ShardId, Option<PodAddress>>) => Effect<void>
  /**
   * Get all pods registered with the cluster.
   */
  readonly getPods: Effect<HashMap<PodAddress, Pod>>
  /**
   * Save the current pods registered with the cluster.
   */
  readonly savePods: (pods: HashMap<PodAddress, Pod>) => Effect<void>
}>() {}
