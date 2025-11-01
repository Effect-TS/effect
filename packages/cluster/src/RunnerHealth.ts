/**
 * @since 1.0.0
 */
import * as FileSystem from "@effect/platform/FileSystem"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
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
  const fs = yield* FileSystem.FileSystem
  const token = yield* fs.readFileString("/var/run/secrets/kubernetes.io/serviceaccount/token").pipe(
    Effect.option
  )
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.filterStatusOk
  )
  const baseRequest = HttpClientRequest.get("https://kubernetes.default.svc/api").pipe(
    token._tag === "Some" ? HttpClientRequest.bearerToken(token.value.trim()) : identity
  )
  const getPods = baseRequest.pipe(
    HttpClientRequest.appendUrl(options?.namespace ? `/v1/namespaces/${options.namespace}/pods` : "/v1/pods"),
    HttpClientRequest.setUrlParam("fieldSelector", "status.phase=Running"),
    options?.labelSelector ? HttpClientRequest.setUrlParam("labelSelector", options.labelSelector) : identity
  )
  const allPods = yield* client.execute(getPods).pipe(
    Effect.flatMap(HttpClientResponse.schemaBodyJson(PodList)),
    Effect.map((list) => {
      const pods = new Map<string, Pod>()
      for (let i = 0; i < list.items.length; i++) {
        const pod = list.items[i]
        pods.set(pod.status.podIP, pod)
      }
      return pods
    }),
    Effect.tapErrorCause((cause) => Effect.logWarning("Failed to fetch pods from Kubernetes API", cause)),
    Effect.cachedWithTTL("10 seconds")
  )

  return RunnerHealth.of({
    isAlive: (address) =>
      allPods.pipe(
        Effect.map((pods) => pods.get(address.host)?.isReady ?? false),
        Effect.catchAllCause(() => Effect.succeed(true))
      )
  })
})

class Pod extends Schema.Class<Pod>("effect/cluster/RunnerHealth/Pod")({
  status: Schema.Struct({
    phase: Schema.String,
    conditions: Schema.Array(Schema.Struct({
      type: Schema.String,
      status: Schema.String,
      lastTransitionTime: Schema.String
    })),
    podIP: Schema.String
  })
}) {
  get isReady(): boolean {
    let initializedAt: string | undefined
    let readyAt: string | undefined
    for (let i = 0; i < this.status.conditions.length; i++) {
      const condition = this.status.conditions[i]
      switch (condition.type) {
        case "Initialized": {
          if (condition.status !== "True") {
            return true
          }
          initializedAt = condition.lastTransitionTime
          break
        }
        case "Ready": {
          if (condition.status === "True") {
            return true
          }
          readyAt = condition.lastTransitionTime
          break
        }
      }
    }
    // if the pod is still booting up, consider it ready as it would have
    // already registered itself with RunnerStorage by now
    return initializedAt === readyAt
  }
}

const PodList = Schema.Struct({
  items: Schema.Array(Pod)
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
  HttpClient.HttpClient | FileSystem.FileSystem
> => Layer.effect(RunnerHealth, makeK8s(options))
