/**
 * Shared setup for the live `*.integration.test.ts` suites: `NodeDocker`
 * configured from the environment (the runner's Docker in CI), and labelled,
 * cleaned-up resources.
 */
import { NodeDocker } from "@effect/platform-node"
import { Effect, type Layer, Stream } from "effect"
import { type Docker, type DockerConfig, DockerContainers, type DockerEngine, DockerImages } from "effect/docker"

/** The `DockerEngine` and `Docker` layer. */
export const layer: Layer.Layer<DockerEngine.DockerEngine | Docker.Docker, DockerConfig.DockerConfigError> = NodeDocker
  .layerFromEnv()

/** The label on everything the suites create. */
export const labels = { "effect-docker-test": "1" }

/** A small image. */
export const image = "docker.io/library/alpine:3.22"

/** Pulls an image unless it is present. */
export const ensureImage = (reference: string) =>
  DockerImages.DockerImages.use((images) =>
    images.inspect(reference).pipe(
      Effect.asVoid,
      Effect.catchReason("DockerError", "NotFound", () => Stream.runDrain(images.pull(reference)))
    )
  )

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

/**
 * Images this test owns: `labels` to build them with, and `reference` to
 * record a tag or a pushed name. Each is removed with the scope, failures
 * included, and nothing another test or run created is touched.
 */
export const scopedImages = Effect.gen(function*() {
  const images = yield* DockerImages.DockerImages
  const id = crypto.randomUUID()
  const references: Array<string> = []
  yield* Effect.addFinalizer(() =>
    Effect.gen(function*() {
      yield* Effect.forEach(references, (reference) => Effect.ignore(images.remove(reference)))
      const built = yield* images.list({ all: true, filters: { label: `effect-docker-test-id=${id}` } })
      yield* Effect.forEach(built, (summary) => Effect.ignore(images.remove(summary.Id, { force: true })))
    }).pipe(Effect.ignore)
  )
  return {
    labels: { ...labels, "effect-docker-test-id": id },
    /** Records a reference this test creates. */
    reference: (reference: string) => {
      references.push(reference)
      return reference
    }
  }
})
