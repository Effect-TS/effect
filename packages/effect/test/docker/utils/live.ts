/**
 * Shared setup for the live `*.integration.test.ts` suites: `NodeDocker`
 * configured from the environment (the runner's Docker in CI), and labelled,
 * cleaned-up resources.
 */
import { NodeDocker } from "@effect/platform-node"
import { Effect, type Layer, Stream } from "effect"
import { type Docker, type DockerConfig, DockerContainers, DockerEngine } from "effect/docker"
import { HttpClientRequest } from "effect/http"

/** The `DockerEngine` and `Docker` layer. */
export const layer: Layer.Layer<DockerEngine.DockerEngine | Docker.Docker, DockerConfig.DockerConfigError> = NodeDocker
  .layerFromEnv()

/** The label on everything the suites create. */
export const labels = { "effect-docker-test": "1" }

/** A small image. */
export const image = "docker.io/library/alpine:3.22"

/** Pulls an image unless it is present. */
export const ensureImage = Effect.fnUntraced(function*(reference: string) {
  const engine = yield* DockerEngine.DockerEngine
  const present = yield* engine.client.get(`/images/${encodeURIComponent(reference)}/json`).pipe(
    Effect.as(true),
    Effect.catchReason("DockerError", "NotFound", () => Effect.succeed(false))
  )
  if (present) return
  const response = yield* engine.client.execute(
    HttpClientRequest.post("/images/create").pipe(HttpClientRequest.setUrlParam("fromImage", reference))
  )
  yield* Stream.runDrain(response.stream)
})

/** Creates a labelled container that is force-removed with the scope. */
export const scopedContainer = (config: Parameters<DockerContainers.DockerContainers["Service"]["create"]>[0]) =>
  Effect.acquireRelease(
    DockerContainers.DockerContainers.use((containers) =>
      containers.create({ ...config, Labels: { ...labels, ...config.Labels } })
    ),
    ({ Id }) =>
      Effect.ignore(
        DockerContainers.DockerContainers.use((containers) => containers.remove(Id, { force: true, volumes: true }))
      )
  ).pipe(Effect.map(({ Id }) => Id))
