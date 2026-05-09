/**
 * @since 1.0.0
 */
import * as K8sHttpClient from "@effect/cluster/K8sHttpClient"
import * as MessageStorage from "@effect/cluster/MessageStorage"
import * as RunnerHealth from "@effect/cluster/RunnerHealth"
import * as Runners from "@effect/cluster/Runners"
import * as RunnerStorage from "@effect/cluster/RunnerStorage"
import type { Sharding } from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as SocketRunner from "@effect/cluster/SocketRunner"
import * as SqlMessageStorage from "@effect/cluster/SqlMessageStorage"
import * as SqlRunnerStorage from "@effect/cluster/SqlRunnerStorage"
import { layerClientProtocol, layerSocketServer } from "@effect/platform-node-shared/NodeClusterSocket"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as SocketServer from "@effect/platform/SocketServer"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import type { SqlClient } from "@effect/sql/SqlClient"
import type { ConfigError } from "effect/ConfigError"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as NodeFileSystem from "./NodeFileSystem.js"
import * as NodeHttpClient from "./NodeHttpClient.js"
import * as Undici from "./Undici.js"

export {
  /**
   * @since 1.0.0
   * @category Re-exports
   */
  layerClientProtocol,
  /**
   * @since 1.0.0
   * @category Re-exports
   */
  layerSocketServer
}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = <
  const ClientOnly extends boolean = false,
  const Storage extends "local" | "sql" | "byo" = never,
  const Health extends "ping" | "k8s" = never
>(
  options?: {
    readonly serialization?: "msgpack" | "ndjson" | undefined
    readonly clientOnly?: ClientOnly | undefined
    readonly storage?: Storage | undefined
    readonly runnerHealth?: Health | undefined
    readonly runnerHealthK8s?: {
      readonly namespace?: string | undefined
      readonly labelSelector?: string | undefined
    } | undefined
    readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig["Type"]> | undefined
  }
): ClientOnly extends true ? Layer.Layer<
    Sharding | Runners.Runners | ("byo" extends Storage ? never : MessageStorage.MessageStorage),
    ConfigError,
    "local" extends Storage ? never
      : "byo" extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage)
      : SqlClient
  > :
  Layer.Layer<
    Sharding | Runners.Runners | ("byo" extends Storage ? never : MessageStorage.MessageStorage),
    SocketServer.SocketServerError | ConfigError,
    "local" extends Storage ? never
      : "byo" extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage)
      : SqlClient
  > =>
{
  const layer: Layer.Layer<any, any, any> = options?.clientOnly
    // client only
    ? Layer.provide(SocketRunner.layerClientOnly, layerClientProtocol)
    // with server
    : Layer.provide(SocketRunner.layer, [layerSocketServer, layerClientProtocol])

  const runnerHealth: Layer.Layer<any, any, any> = options?.clientOnly
    ? Layer.empty as any
    : options?.runnerHealth === "k8s"
    ? RunnerHealth.layerK8s(options.runnerHealthK8s).pipe(
      Layer.provide(layerK8sHttpClient)
    )
    : RunnerHealth.layerPing.pipe(
      Layer.provide(Runners.layerRpc),
      Layer.provide(layerClientProtocol)
    )

  return layer.pipe(
    Layer.provide(runnerHealth),
    Layer.provideMerge(
      options?.storage === "local"
        ? MessageStorage.layerNoop
        : options?.storage === "byo"
        ? Layer.empty
        : Layer.orDie(SqlMessageStorage.layer)
    ),
    Layer.provide(
      options?.storage === "local"
        ? RunnerStorage.layerMemory
        : options?.storage === "byo"
        ? Layer.empty
        : Layer.orDie(SqlRunnerStorage.layer)
    ),
    Layer.provide(ShardingConfig.layerFromEnv(options?.shardingConfig)),
    Layer.provide(
      options?.serialization === "ndjson" ? RpcSerialization.layerNdjson : RpcSerialization.layerMsgPack
    )
  ) as any
}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerDispatcherK8s: Layer.Layer<NodeHttpClient.Dispatcher> = Layer.scoped(NodeHttpClient.Dispatcher)(
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const caCertOption = yield* fs.readFileString("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt").pipe(
      Effect.option
    )
    if (caCertOption._tag === "Some") {
      return yield* Effect.acquireRelease(
        Effect.sync(() =>
          new Undici.Agent({
            connect: {
              ca: caCertOption.value
            }
          })
        ),
        (agent) => Effect.promise(() => agent.destroy())
      )
    }

    return yield* NodeHttpClient.makeDispatcher
  })
).pipe(
  Layer.provide(NodeFileSystem.layer)
)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerK8sHttpClient: Layer.Layer<K8sHttpClient.K8sHttpClient> = K8sHttpClient.layer.pipe(
  Layer.provide(Layer.fresh(NodeHttpClient.layerUndiciWithoutDispatcher)),
  Layer.provide(layerDispatcherK8s),
  Layer.provide(NodeFileSystem.layer)
)
