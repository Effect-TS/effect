/**
 * Shared setup for the live `*.integration.test.ts` suites: `NodeDocker`
 * configured from the environment (the runner's Docker in CI).
 */
import { NodeDocker } from "@effect/platform-node"
import type { Layer } from "effect"
import type { Docker, DockerConfig, DockerEngine } from "effect/docker"

/** The `DockerEngine` and `Docker` layer. */
export const layer: Layer.Layer<DockerEngine.DockerEngine | Docker.Docker, DockerConfig.DockerConfigError> = NodeDocker
  .layerFromEnv()
