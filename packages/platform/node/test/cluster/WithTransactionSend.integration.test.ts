import { NodeCrypto } from "@effect/platform-node"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Layer, Option } from "effect"
import {
  ClusterSchema,
  Entity,
  RunnerAddress,
  RunnerHealth,
  Runners,
  Sharding,
  ShardingConfig,
  SqlMessageStorage,
  SqlRunnerStorage
} from "effect/cluster"
import { Rpc } from "effect/rpc"
import { TestClock } from "effect/testing"
import { PgContainer } from "../fixtures/pg-utils.ts"

const Sender = Entity.make("Sender", [
  Rpc.make("Send").annotate(ClusterSchema.WithTransaction, true)
]).annotateRpcs(ClusterSchema.Persisted, true)

const Receiver = Entity.make("Receiver", [Rpc.make("Receive")]).annotateRpcs(ClusterSchema.Persisted, true)

describe("Sharding WithTransaction sends", { concurrent: false }, () => {
  it.layer(Layer.orDie(PgContainer.layerClient), { concurrent: false, timeout: 120_000 })((it) => {
    it.effect("a discarded send is delivered after the commit without a storage poll", () =>
      Effect.gen(function*() {
        const received = yield* Deferred.make<void>()
        const layer = Layer.mergeAll(
          Sender.toLayer(Effect.gen(function*() {
            const receiver = yield* Receiver.client
            return Sender.of({
              Send: () => Effect.orDie(receiver("receiver").Receive(undefined, { discard: true }))
            })
          })),
          Receiver.toLayer({ Receive: () => Effect.asVoid(Deferred.succeed(received, void 0)) })
        ).pipe(
          Layer.provideMerge(Sharding.layer),
          Layer.provide([SqlRunnerStorage.layer, RunnerHealth.layerNoop, Runners.layerNoop]),
          Layer.provide(SqlMessageStorage.layer),
          Layer.provide(NodeCrypto.layer),
          Layer.provide(ShardingConfig.layer({
            runnerAddress: Option.some(RunnerAddress.make("localhost", 34431)),
            shardsPerGroup: 1,
            entityMessagePollInterval: "1 hour",
            refreshAssignmentsInterval: 100,
            entityTerminationTimeout: 0
          }))
        )
        yield* Effect.gen(function*() {
          const sender = yield* Sender.client
          yield* sender("sender").Send()
          const delivered = yield* Deferred.await(received).pipe(Effect.timeoutOption("5 seconds"))
          assert.isTrue(Option.isSome(delivered))
        }).pipe(Effect.provide(layer))
      }).pipe(TestClock.withLive), 30_000)
  })
})
