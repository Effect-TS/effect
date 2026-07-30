import { NodeClusterSocket, NodeCrypto } from "@effect/platform-node"
import { Effect, Exit, Layer, Option, Scope } from "effect"
import type { Entity, Sharding } from "effect/unstable/cluster"
import {
  RunnerAddress,
  RunnerHealth,
  ShardingConfig,
  SocketRunner,
  SqlMessageStorage,
  SqlRunnerStorage
} from "effect/unstable/cluster"
import type { Rpc } from "effect/unstable/rpc"
import { RpcSerialization } from "effect/unstable/rpc"
import { PgContainer } from "../fixtures/pg-utils.ts"

const clusterConfig = {
  entityMessagePollInterval: 100,
  entityReplyPollInterval: 50,
  entityTerminationTimeout: 0,
  refreshAssignmentsInterval: 100,
  sendRetryInterval: 50
}

const StorageLive = Layer.mergeAll(
  SqlMessageStorage.layer,
  SqlRunnerStorage.layer
).pipe(
  Layer.provide(PgContainer.layerClient),
  Layer.provide(NodeCrypto.layer),
  Layer.provide(ShardingConfig.layer(clusterConfig)),
  Layer.orDie
)

let nextPort = 40_000 + (process.pid % 1000) * 16

const runnerLayer = (
  address: RunnerAddress.RunnerAddress,
  entities: Layer.Layer<never, never, Sharding.Sharding>
) =>
  entities.pipe(
    Layer.provideMerge(SocketRunner.layer),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(NodeClusterSocket.layerSocketServer),
    Layer.provide(NodeClusterSocket.layerClientProtocol),
    Layer.provide(ShardingConfig.layer({
      ...clusterConfig,
      runnerAddress: Option.some(address)
    })),
    Layer.provide(RpcSerialization.layerMsgPack)
  )

const clientLayer = SocketRunner.layerClientOnly.pipe(
  Layer.provide(NodeClusterSocket.layerClientProtocol),
  Layer.provide(ShardingConfig.layer(clusterConfig)),
  Layer.provide(RpcSerialization.layerMsgPack)
)

export const make = Effect.fnUntraced(function*(
  entities: Layer.Layer<never, never, Sharding.Sharding>
) {
  const parentScope = yield* Effect.scope
  const storageScope = yield* Scope.fork(parentScope)
  const storage = yield* Layer.buildWithScope(StorageLive, storageScope)
  const clientScope = yield* Scope.fork(parentScope)
  const client = yield* clientLayer.pipe(
    Layer.buildWithScope(clientScope),
    Effect.provide(storage)
  )
  const runners = new Map<number, Scope.Closeable>()
  const firstPort = nextPort
  nextPort += 16

  const startRunner = Effect.fnUntraced(function*(index: number) {
    if (runners.has(index)) return
    const scope = yield* Scope.fork(parentScope)
    const address = RunnerAddress.make("localhost", firstPort + index)
    yield* runnerLayer(address, entities).pipe(
      Layer.buildWithScope(scope),
      Effect.provide(storage)
    )
    runners.set(index, scope)
  })

  const kill = Effect.fnUntraced(function*(index: number) {
    const scope = runners.get(index)
    if (scope === undefined) return
    yield* Scope.close(scope, Exit.void)
    runners.delete(index)
  })

  const start = Effect.fnUntraced(function*(runnerCount: number) {
    yield* Effect.forEach(
      Array.from({ length: runnerCount }, (_, index) => index),
      startRunner,
      { discard: true }
    )
    yield* Effect.sleep(1000)
  })

  const restart = Effect.fnUntraced(function*(index: number) {
    yield* kill(index)
    yield* startRunner(index)
    yield* Effect.sleep(1000)
  })

  const getClient = <Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>) =>
    entity.client.pipe(Effect.provide(client))

  return { start, kill, restart, getClient } as const
})
