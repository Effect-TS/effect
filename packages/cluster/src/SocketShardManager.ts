/**
 * @since 1.0.0
 */
import { SocketServer } from "@effect/platform/SocketServer"
import type { RpcSerialization } from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MessageStorage from "./MessageStorage.js"
import type { RunnerHealth } from "./RunnerHealth.js"
import * as Runners from "./Runners.js"
import type { ShardingConfig } from "./ShardingConfig.js"
import * as ShardManager from "./ShardManager.js"
import type { ShardStorage } from "./ShardStorage.js"

const withLogAddress = <A, E, R>(layer: Layer.Layer<A, E, R>): Layer.Layer<A, E, R | SocketServer> =>
  Layer.effectDiscard(Effect.gen(function*() {
    const server = yield* SocketServer
    const address = server.address._tag === "UnixAddress"
      ? server.address.path
      : `${server.address.hostname}:${server.address.port}`
    yield* Effect.annotateLogs(Effect.logInfo(`Listening on: ${address}`), {
      package: "@effect/cluster",
      service: "ShardManager"
    })
  })).pipe(Layer.provideMerge(layer))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  ShardManager.ShardManager,
  never,
  | ShardStorage
  | SocketServer
  | Runners.RpcClientProtocol
  | RpcSerialization
  | RunnerHealth
  | ShardManager.Config
  | ShardingConfig
> = ShardManager.layerServer.pipe(
  withLogAddress,
  Layer.provide(RpcServer.layerProtocolSocketServer),
  Layer.provideMerge(ShardManager.layer),
  Layer.provide(Runners.layerRpc),
  Layer.provide(MessageStorage.layerNoop)
)
