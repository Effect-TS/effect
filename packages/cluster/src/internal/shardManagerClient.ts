import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as PodAddress from "../PodAddress.js"
import * as ShardId from "../ShardId.js"
import * as ShardingConfig from "../ShardingConfig.js"
import type * as ShardManagerClient from "../ShardManagerClient.js"

/** @internal */
const ShardManagerSymbolKey = "@effect/cluster/ShardManagerClient"

/** @internal */
export const ShardManagerClientTypeId: ShardManagerClient.ShardManagerClientTypeId = Symbol.for(
  ShardManagerSymbolKey
) as ShardManagerClient.ShardManagerClientTypeId

/** @internal */
export const shardManagerClientTag = Context.GenericTag<ShardManagerClient.ShardManagerClient>(ShardManagerSymbolKey)

/** @internal */
export function make(
  args: Omit<ShardManagerClient.ShardManagerClient, ShardManagerClient.ShardManagerClientTypeId>
): ShardManagerClient.ShardManagerClient {
  return ({ [ShardManagerClientTypeId]: ShardManagerClientTypeId, ...args })
}

/** @internal */
export const local = pipe(
  Layer.effect(
    shardManagerClientTag,
    Effect.gen(function*() {
      const config = yield* ShardingConfig.ShardingConfig
      const pod = PodAddress.make(config.selfHost, config.shardingPort)
      let shards = HashMap.empty<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>()
      for (let i = 1; i <= config.numberOfShards; i++) {
        shards = HashMap.set(shards, ShardId.make(i), Option.some(pod))
      }
      return make({
        register: () => Effect.void,
        unregister: () => Effect.void,
        notifyUnhealthyPod: () => Effect.void,
        getAssignments: Effect.succeed(shards)
      })
    })
  )
)
