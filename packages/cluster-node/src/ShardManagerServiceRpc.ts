/**
 * @since 1.0.0
 */
import * as ShardManager from "@effect/cluster/ShardManager"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcRouter from "@effect/rpc/RpcRouter"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as ShardManagerProtocolHttp from "./ShardManagerProtocol.js"

/**
 * @since 1.0.0
 * @category rpc
 */
export const router = RpcRouter.make(
  Rpc.effect(ShardManagerProtocolHttp.Register, (request) =>
    pipe(
      ShardManager.ShardManager,
      Effect.flatMap((shardManager) => shardManager.register(request.pod))
    )),
  Rpc.effect(ShardManagerProtocolHttp.Unregister, (request) =>
    pipe(
      ShardManager.ShardManager,
      Effect.flatMap((shardManager) => shardManager.unregister(request.podAddress))
    )),
  Rpc.effect(ShardManagerProtocolHttp.NotifyUnhealthyPod, (request) =>
    pipe(
      ShardManager.ShardManager,
      Effect.flatMap((shardManager) => shardManager.notifyUnhealthyPod(request.podAddress))
    )),
  Rpc.effect(ShardManagerProtocolHttp.GetAssignements, () =>
    pipe(
      ShardManager.ShardManager,
      Effect.flatMap((shardManager) => shardManager.getAssignments)
    ))
)

/**
 * @since 1.0.0
 * @category models
 */
export type ShardManagerServiceRpc = typeof router

/**
 * @since 1.0.0
 * @category models
 */
export type ShardManagerServiceRpcRequest = RpcRouter.RpcRouter.Request<typeof router>
