import { assert } from "@effect/vitest"
import { Effect, Layer, Option, type Schema } from "effect"
import { TestClock } from "effect/testing"
import {
  ClusterWorkflowEngine,
  MessageStorage,
  RunnerHealth,
  Runners,
  RunnerStorage,
  Sharding,
  ShardingConfig
} from "effect/unstable/cluster"
import type { Workflow } from "effect/unstable/workflow"

export const makeTestWorkflowEngine = <Storage = MessageStorage.MemoryDriver>(options?: {
  readonly config?: Partial<ShardingConfig.ShardingConfig["Service"]> | undefined
  readonly shardingLayer?: typeof Sharding.layer | undefined
  readonly storageLayer?:
    | Layer.Layer<MessageStorage.MessageStorage | Storage, never, ShardingConfig.ShardingConfig>
    | undefined
}) =>
  ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(options?.shardingLayer ?? Sharding.layer),
    Layer.provide(Runners.layerNoop),
    Layer.provideMerge(
      (options?.storageLayer ?? MessageStorage.layerMemory) as Layer.Layer<
        MessageStorage.MessageStorage | Storage,
        never,
        ShardingConfig.ShardingConfig
      >
    ),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(ShardingConfig.layer({
      shardsPerGroup: 300,
      availableShardGroups: ["default", "workflow"],
      assignedShardGroups: ["default", "workflow"],
      entityMailboxCapacity: 10,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 5000,
      sendRetryInterval: 100,
      ...options?.config
    }))
  )

/** Steps the TestClock and storage poller until the workflow reports `tag`. */
export const pollUntil = <A extends Schema.Top, E extends Schema.Top>(
  workflow: Workflow.Workflow<any, any, A, E>,
  executionId: string,
  tag: "Suspended" | "Complete",
  options?: {
    readonly rounds?: number | undefined
    readonly ready?: (() => boolean) | undefined
  }
) =>
  Effect.gen(function*() {
    const sharding = yield* Sharding.Sharding
    const rounds = options?.rounds ?? 200
    const ready = options?.ready ?? (() => true)
    let result = yield* workflow.poll(executionId)
    for (let i = 0; i < rounds && !(Option.isSome(result) && result.value._tag === tag && ready()); i++) {
      yield* Effect.yieldNow
      yield* TestClock.adjust(1)
      yield* sharding.pollStorage
      result = yield* workflow.poll(executionId)
    }
    assert(
      Option.isSome(result) && result.value._tag === tag && ready(),
      `workflow must reach ${tag}: ${JSON.stringify(result)}`
    )
    return result.value
  })
