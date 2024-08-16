/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as MessageStorage from "./MessageStorage.js"
import type { PodAddress } from "./PodAddress.js"
import * as Pods from "./Pods.js"
import type { ShardingConfig } from "./ShardingConfig.js"

/**
 * Represents the service used to check if a pod is healthy.
 *
 * If a pod is responsive, shards will not be re-assigned because the pod may
 * still be processing messages. If a pod is not responsive, then its
 * associated shards can and will be re-assigned to a different pod.
 *
 * @since 1.0.0
 * @category models
 */
export class PodsHealth extends Context.Tag("@effect/cluster/PodsHealth")<
  PodsHealth,
  {
    readonly isAlive: (address: PodAddress) => Effect.Effect<boolean>
  }
>() {}

/**
 * A layer which will **always** consider a pod healthy.
 *
 * This is useful for testing.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerNoop = Layer.succeed(
  PodsHealth,
  PodsHealth.of({
    isAlive: () => Effect.succeed(true)
  })
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: Effect.Effect<
  PodsHealth["Type"],
  never,
  Pods.Pods
> = Effect.gen(function*() {
  const pods = yield* Pods.Pods

  function isAlive(address: PodAddress): Effect.Effect<boolean> {
    return Effect.isSuccess(Effect.timeout(pods.ping(address), 3000))
  }

  return PodsHealth.of({ isAlive })
})

/**
 * A layer which will ping a pod directly to check if it is healthy.
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<
  PodsHealth,
  never,
  Pods.Pods
> = Layer.effect(PodsHealth, make)

/**
 * A layer which will ping a pod directly to check if it is healthy.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerRpc: Layer.Layer<
  PodsHealth,
  never,
  Pods.RpcClientProtocol | ShardingConfig
> = layer.pipe(
  Layer.provide(Pods.layerRpc),
  Layer.provide(MessageStorage.layerNoop)
)
