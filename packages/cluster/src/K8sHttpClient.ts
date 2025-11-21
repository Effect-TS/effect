/**
 * @since 1.0.0
 */
import * as FileSystem from "@effect/platform/FileSystem"
import * as HttpClient from "@effect/platform/HttpClient"
import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as ParseResult from "effect/ParseResult"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import type * as v1 from "kubernetes-types/core/v1.d.ts"

/**
 * @since 1.0.0
 * @category Tags
 */
export class K8sHttpClient extends Context.Tag("@effect/cluster/K8sHttpClient")<
  K8sHttpClient,
  HttpClient.HttpClient
>() {}

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  K8sHttpClient,
  never,
  HttpClient.HttpClient | FileSystem.FileSystem
> = Layer.effect(
  K8sHttpClient,
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const token = yield* fs.readFileString("/var/run/secrets/kubernetes.io/serviceaccount/token").pipe(
      Effect.option
    )
    return (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl("https://kubernetes.default.svc/api")),
      token._tag === "Some" ? HttpClient.mapRequest(HttpClientRequest.bearerToken(token.value.trim())) : identity,
      HttpClient.filterStatusOk,
      HttpClient.retryTransient({
        schedule: Schedule.spaced(5000)
      })
    )
  })
)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const makeGetPods: (
  options?: {
    readonly namespace?: string | undefined
    readonly labelSelector?: string | undefined
  } | undefined
) => Effect.Effect<
  Effect.Effect<Map<string, Pod>, HttpClientError.HttpClientError | ParseResult.ParseError, never>,
  never,
  K8sHttpClient
> = Effect.fnUntraced(function*(options?: {
  readonly namespace?: string | undefined
  readonly labelSelector?: string | undefined
}) {
  const client = yield* K8sHttpClient

  const getPods = HttpClientRequest.get(
    options?.namespace ? `/v1/namespaces/${options.namespace}/pods` : "/v1/pods"
  ).pipe(
    HttpClientRequest.setUrlParam("fieldSelector", "status.phase=Running"),
    options?.labelSelector ? HttpClientRequest.setUrlParam("labelSelector", options.labelSelector) : identity
  )

  return yield* client.execute(getPods).pipe(
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
})

/**
 * @since 1.0.0
 * @category Constructors
 */
export const makeCreatePod = Effect.gen(function*() {
  const client = yield* K8sHttpClient

  return Effect.fnUntraced(function*(spec: v1.Pod) {
    spec = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: {
        namespace: "default",
        ...spec.metadata
      },
      ...spec
    }
    const namespace = spec.metadata?.namespace ?? "default"
    const name = spec.metadata!.name!
    const replacePod = HttpClientRequest.put(`/v1/namespaces/${namespace}/pods/${name}`).pipe(
      HttpClientRequest.bodyUnsafeJson(spec),
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Pod))
    )
    const createPod = HttpClientRequest.post(`/v1/namespaces/${namespace}/pods`).pipe(
      HttpClientRequest.bodyUnsafeJson(spec),
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Pod))
    )
    const upsertPod = createPod.pipe(
      Effect.catchIf(
        (err) => err._tag === "ResponseError" && err.response.status === 409,
        () => replacePod
      ),
      Effect.tapErrorCause(Effect.log),
      Effect.orDie
    )
    const readPod = HttpClientRequest.get(`/v1/namespaces/${namespace}/pods/${name}`).pipe(
      client.execute,
      Effect.flatMap(HttpClientResponse.schemaBodyJson(Pod)),
      Effect.tapErrorCause(Effect.log),
      Effect.orDie
    )
    const deletePod = HttpClientRequest.del(`/v1/namespaces/${namespace}/pods/${name}`).pipe(
      client.execute,
      Effect.flatMap((res) => res.json),
      Effect.catchIf((err) => err._tag === "ResponseError" && err.response.status === 404, () => Effect.void),
      Effect.tapErrorCause(Effect.log),
      Effect.orDie,
      Effect.asVoid
    )
    yield* Effect.addFinalizer(() => deletePod)

    let pod = yield* upsertPod
    while (!pod.isReady) {
      yield* Effect.sleep("5 seconds")
      pod = yield* readPod
    }
    return pod
  }, Effect.withSpan("createPod"))
})

/**
 * @since 1.0.0
 * @category Schemas
 */
export class Pod extends Schema.Class<Pod>("@effect/cluster/K8sHttpClient/Pod")({
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
    for (let i = 0; i < this.status.conditions.length; i++) {
      const condition = this.status.conditions[i]
      if (condition.type === "Ready") {
        return condition.status === "True"
      }
    }
    return false
  }

  get isReadyOrInitializing(): boolean {
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
