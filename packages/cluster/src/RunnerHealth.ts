/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MessageStorage from "./MessageStorage.js"
import type { RunnerAddress } from "./RunnerAddress.js"
import * as Runners from "./Runners.js"
import type { ShardingConfig } from "./ShardingConfig.js"

/**
 * Represents the service used to check if a Runner is healthy.
 *
 * If a Runner is responsive, shards will not be re-assigned because the Runner may
 * still be processing messages. If a Runner is not responsive, then its
 * associated shards can and will be re-assigned to a different Runner.
 *
 * @since 1.0.0
 * @category models
 */
export class RunnerHealth extends Context.Tag("@effect/cluster/RunnerHealth")<
  RunnerHealth,
  {
    readonly isAlive: (address: RunnerAddress) => Effect.Effect<boolean>
  }
>() {}

/**
 * A layer which will **always** consider a Runner healthy.
 *
 * This is useful for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop = Layer.succeed(
  RunnerHealth,
  RunnerHealth.of({
    isAlive: () => Effect.succeed(true)
  })
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: Effect.Effect<
  RunnerHealth["Type"],
  never,
  Runners.Runners
> = Effect.gen(function*() {
  const runners = yield* Runners.Runners

  function isAlive(address: RunnerAddress): Effect.Effect<boolean> {
    return Effect.isSuccess(Effect.timeout(runners.ping(address), 3000))
  }

  return RunnerHealth.of({ isAlive })
})

/**
 * A layer which will ping a Runner directly to check if it is healthy.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<
  RunnerHealth,
  never,
  Runners.Runners
> = Layer.effect(RunnerHealth, make)

/**
 * A layer which will ping a Runner directly to check if it is healthy.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerRpc: Layer.Layer<
  RunnerHealth,
  never,
  Runners.RpcClientProtocol | ShardingConfig
> = layer.pipe(
  Layer.provide(Runners.layerRpc),
  Layer.provide(MessageStorage.layerNoop)
)
