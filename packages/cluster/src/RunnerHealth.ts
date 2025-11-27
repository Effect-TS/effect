/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as K8s from "./K8sHttpClient.js"
import type { RunnerAddress } from "./RunnerAddress.js"
import * as Runners from "./Runners.js"

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
export const layerNoop = Layer.succeed(RunnerHealth, {
  isAlive: () => Effect.succeed(true)
})

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
  const schedule = Schedule.spaced(500)

  function isAlive(address: RunnerAddress): Effect.Effect<boolean> {
    return runners.ping(address).pipe(
      Effect.timeout(10_000),
      Effect.retry({ times: 5, schedule }),
      Effect.isSuccess
    )
  }

  return RunnerHealth.of({ isAlive })
})

/**
 * A layer which will ping a Runner directly to check if it is healthy.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerPing: Layer.Layer<
  RunnerHealth,
  never,
  Runners.Runners
> = Layer.scoped(RunnerHealth, makePing)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const makeK8s = Effect.fnUntraced(function*(options?: {
  readonly namespace?: string | undefined
  readonly labelSelector?: string | undefined
}) {
  const allPods = yield* K8s.makeGetPods(options)

  return RunnerHealth.of({
    isAlive: (address) =>
      allPods.pipe(
        Effect.map((pods) => pods.get(address.host)?.isReadyOrInitializing ?? false),
        Effect.catchAllCause(() => Effect.succeed(true))
      )
  })
})

/**
 * A layer which will check the Kubernetes API to see if a Runner is healthy.
 *
 * The provided HttpClient will need to add the pod's CA certificate to its
 * trusted root certificates in order to communicate with the Kubernetes API.
 *
 * The pod service account will also need to have permissions to list pods in
 * order to use this layer.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerK8s = (
  options?: {
    readonly namespace?: string | undefined
    readonly labelSelector?: string | undefined
  } | undefined
): Layer.Layer<
  RunnerHealth,
  never,
  K8s.K8sHttpClient
> => Layer.effect(RunnerHealth, makeK8s(options))
