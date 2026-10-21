/**
 * Every service of the Docker Engine API client in one layer, all built over
 * one `DockerEngine`.
 *
 * `NodeDocker.layer` already provides them. Use {@link layer} with a
 * `DockerEngine` of your own, for example one made with `DockerEngine.make`
 * over your own `HttpClient`.
 *
 * **Example** (Reading the Engine's version)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerSystem } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const system = yield* DockerSystem.DockerSystem
 *   const { Version, ApiVersion } = yield* system.version
 *   return `${Version} (API ${ApiVersion})`
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Layer from "../Layer.ts"
import type { DockerEngine } from "./DockerEngine.ts"
import * as DockerSystem from "./DockerSystem.ts"

/**
 * Every service {@link layer} provides.
 *
 * @stability unstable
 * @category models
 * @since 4.0.6
 */
export type Docker = DockerSystem.DockerSystem

/**
 * Provides every service over the `DockerEngine` in context, each built with
 * its own `make`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<Docker, never, DockerEngine> = Layer.mergeAll(DockerSystem.layer)
