/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RcMap from "effect/RcMap"
import type * as Scope from "effect/Scope"
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
    /**
     * Used to indicate that a Runner is connected to this host and is healthy,
     * while the Scope is active.
     */
    readonly onConnection: (address: RunnerAddress) => Effect.Effect<void, never, Scope.Scope>
    readonly isAlive: (address: RunnerAddress) => Effect.Effect<boolean>
  }
>() {}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (
  options: { readonly isAlive: (address: RunnerAddress) => Effect.Effect<boolean> }
) => Effect.Effect<
  RunnerHealth["Type"],
  never,
  Scope.Scope
> = Effect.fnUntraced(function*(options: {
  readonly isAlive: (address: RunnerAddress) => Effect.Effect<boolean>
}) {
  const connections = yield* RcMap.make({
    lookup: (_address: RunnerAddress) => Effect.void
  })

  const onConnection = (address: RunnerAddress) => RcMap.get(connections, address)
  const isAlive = Effect.fnUntraced(function*(address: RunnerAddress) {
    if (yield* RcMap.has(connections, address)) {
      return true
    }
    return yield* options.isAlive(address)
  })

  return RunnerHealth.of({
    onConnection,
    isAlive
  })
})

/**
 * A layer which will **always** consider a Runner healthy.
 *
 * This is useful for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop = Layer.scoped(
  RunnerHealth,
  make({
    isAlive: () => Effect.succeed(true)
  })
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const makePing: Effect.Effect<
  RunnerHealth["Type"],
  never,
  Runners.Runners | Scope.Scope
> = Effect.gen(function*() {
  const runners = yield* Runners.Runners

  function isAlive(address: RunnerAddress): Effect.Effect<boolean> {
    return runners.ping(address).pipe(
      Effect.timeout(3000),
      Effect.retry({ times: 3 }),
      Effect.isSuccess
    )
  }

  return yield* make({ isAlive })
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
> = Layer.scoped(RunnerHealth, makePing)

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
