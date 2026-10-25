/**
 * Volumes: list, create, inspect, update, remove and prune.
 *
 * Request bodies are the generated `DockerSchema` types.
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as DockerApi from "./DockerApi.ts"
import { apiClient, DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The volumes API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerVolumes extends Context.Service<DockerVolumes, {
  /**
   * Lists volumes.
   *
   * **Details**
   *
   * [Engine API: VolumeList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumeList).
   * Typical reasons: `BadRequest`, `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<DockerSchema.VolumeListResponse, DockerError>
  /**
   * Creates a volume. Creating a volume that exists returns it.
   *
   * **Details**
   *
   * [Engine API: VolumeCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumeCreate).
   * Typical reasons: `ServerError`, `SwarmUnavailable` (a cluster volume,
   * outside a Swarm manager), `ConnectionFailed`.
   */
  readonly create: (
    config?: DockerSchema.VolumeCreateRequest
  ) => Effect.Effect<DockerSchema.Volume, DockerError>
  /**
   * Inspects a volume.
   *
   * **Details**
   *
   * [Engine API: VolumeInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumeInspect).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly inspect: (name: string) => Effect.Effect<DockerSchema.Volume, DockerError>
  /**
   * Updates a cluster volume. Only Swarm cluster volumes can be updated.
   *
   * **Details**
   *
   * [Engine API: VolumeUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumeUpdate).
   * `version` is the volume's current object version, from `inspect`.
   *
   * Typical reasons: `NotFound`, `BadRequest`, `SwarmUnavailable` (not a
   * Swarm manager), `ConnectionFailed`.
   */
  readonly update: (
    name: string,
    config: DockerSchema.VolumeUpdateRequest,
    options: { readonly version: number }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes a volume.
   *
   * **Details**
   *
   * [Engine API: VolumeDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumeDelete).
   * Typical reasons: `NotFound`, `Conflict` (in use), `ConnectionFailed`.
   */
  readonly remove: (
    name: string,
    options?: { readonly force?: boolean | undefined }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes unused volumes.
   *
   * **Details**
   *
   * [Engine API: VolumePrune](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Volume/operation/VolumePrune).
   * Docker removes only anonymous volumes unless the `all: "true"` filter is
   * given.
   *
   * Typical reasons: `Conflict` (a prune is already running),
   * `ConnectionFailed`.
   */
  readonly prune: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<DockerSchema.VolumePruneResponse, DockerError>
}>()("effect/docker/DockerVolumes") {}

/**
 * Builds the {@link DockerVolumes} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerVolumes["Service"], never, DockerEngine> = Effect.gen(function*() {
  const api = yield* apiClient(yield* DockerEngine, DockerApi.Volumes, "docker.Volumes")
  return DockerVolumes.of({
    list: (options) => api.list({ query: options ?? {} }),
    create: (config) => api.create({ payload: config ?? {} }),
    inspect: (name) => api.inspect({ params: { name } }),
    update: (name, config, options) => api.update({ params: { name }, query: options, payload: config }),
    remove: (name, options) => api.remove({ params: { name }, query: options ?? {} }),
    prune: (options) => api.prune({ query: options ?? {} })
  })
})

/**
 * Provides {@link DockerVolumes} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerVolumes, never, DockerEngine> = Layer.effect(DockerVolumes, make)
