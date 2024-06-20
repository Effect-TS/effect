/**
 * @since 1.0.0
 */
import * as Pod from "@effect/cluster/Pod"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardManagerClient from "@effect/cluster/ShardManagerClient"
import type * as Resolver from "@effect/rpc/Resolver"
import type * as Rpc from "@effect/rpc/Rpc"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as RequestResolver from "effect/RequestResolver"
import * as ShardManagerProtocol from "./ShardManagerProtocol.js"
import type * as ShardManagerServiceRpc from "./ShardManagerServiceRpc.js"

/**
 * @since 1.0.0
 * @category layer
 */
export function shardManagerClientRpc(
  makeClient: (shardManagerUri: string) => Resolver.Client<
    RequestResolver.RequestResolver<Rpc.Request<ShardManagerServiceRpc.ShardManagerServiceRpcRequest>, never>
  >
) {
  return Layer.effect(
    ShardManagerClient.ShardManagerClient,
    Effect.gen(function*(_) {
      const config = yield* _(ShardingConfig.ShardingConfig)
      const client = makeClient(config.shardManagerUri)

      return ShardManagerClient.make({
        register: (podAddress) =>
          client(new ShardManagerProtocol.Register({ pod: Pod.make(podAddress, config.serverVersion) })),
        unregister: (podAddress) => client(new ShardManagerProtocol.Unregister({ podAddress })),
        notifyUnhealthyPod: (podAddress) => client(new ShardManagerProtocol.NotifyUnhealthyPod({ podAddress })),
        getAssignments: client(new ShardManagerProtocol.GetAssignements())
      })
    })
  )
}
