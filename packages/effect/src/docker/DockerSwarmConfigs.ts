/**
 * Swarm configs: list, inspect, create, update and remove. Only a manager
 * answers; elsewhere every operation fails with `SwarmUnavailable`.
 *
 * A config's `Data` is bytes, sent as the padded standard base64 the Engine
 * requires; unlike a secret's, `inspect` returns it. Only `Labels` can change
 * after creation.
 *
 * **Example** (Creating a config)
 *
 * ```ts import.meta.vitest
 * import { DockerSwarmConfigs } from "effect/docker"
 *
 * const program = DockerSwarmConfigs.DockerSwarmConfigs.use((configs) =>
 *   configs.create({ Name: "nginx.conf", Data: new TextEncoder().encode("events {}\n") })
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import * as DockerApi from "./DockerApi.ts"
import { DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"
import { apiClient, modifyWith, withOperation } from "./internal/engine.ts"

/**
 * The Swarm configs API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerSwarmConfigs extends Context.Service<DockerSwarmConfigs, {
  /**
   * Lists configs.
   *
   * **Details**
   *
   * [Engine API: ConfigList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Config/operation/ConfigList).
   * Filters: `id`, `label`, `name` and `names`.
   *
   * Typical reasons: `SwarmUnavailable`, `BadRequest` for an invalid filter,
   * `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerApi.Config>, DockerError>
  /**
   * Inspects a config, by ID or name, with its `Data`.
   *
   * **Details**
   *
   * [Engine API: ConfigInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Config/operation/ConfigInspect).
   * Typical reasons: `NotFound`, `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly inspect: (id: string) => Effect.Effect<DockerApi.Config, DockerError>
  /**
   * Creates a config, and returns its ID.
   *
   * **Details**
   *
   * [Engine API: ConfigCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Config/operation/ConfigCreate).
   * `Data` is at most 1000 KB.
   *
   * Typical reasons: `Conflict` (the name is taken), `BadRequest`,
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly create: (spec: DockerApi.ConfigSpec) => Effect.Effect<DockerSchema.ConfigCreateResponse, DockerError>
  /**
   * Updates a config's labels.
   *
   * **Details**
   *
   * [Engine API: ConfigUpdate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Config/operation/ConfigUpdate).
   * Only `Labels` can change: start from `inspect`'s `Spec`, keeping its
   * `Data` or leaving it out. Any other change fails with `BadRequest`.
   * `version` is `inspect`'s `Version.Index`; when the config changed since,
   * the Engine fails with `ServerError` and the message `update out of
   * sequence`.
   *
   * Typical reasons: `BadRequest`, `NotFound`, `ServerError` (out of
   * sequence), `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly update: (
    id: string,
    spec: DockerApi.ConfigSpec,
    options: { readonly version: number }
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes a config.
   *
   * **Details**
   *
   * [Engine API: ConfigDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Config/operation/ConfigDelete).
   * Typical reasons: `NotFound`, `BadRequest` (a service uses it),
   * `SwarmUnavailable`, `ConnectionFailed`.
   */
  readonly remove: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Updates a config's labels from its current spec: inspects the config, and
   * updates it with `f` of its `Spec` at the version read.
   *
   * **Details**
   *
   * When another update comes first (`update out of sequence`), it starts
   * over from a fresh `inspect`, at most 5 times in all; any other failure
   * ends it.
   *
   * Typical reasons: `inspect`'s and `update`'s.
   */
  readonly modify: (
    id: string,
    f: (spec: DockerApi.ConfigSpec) => DockerApi.ConfigSpec
  ) => Effect.Effect<void, DockerError>
}>()("effect/docker/DockerSwarmConfigs") {}

/**
 * Builds the {@link DockerSwarmConfigs} service over the `DockerEngine` in
 * context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make: Effect.Effect<DockerSwarmConfigs["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.SwarmConfigs, "docker.SwarmConfigs")
  const inspect: DockerSwarmConfigs["Service"]["inspect"] = (id) => api.inspect({ params: { id } })
  const update: DockerSwarmConfigs["Service"]["update"] = (id, spec, options) =>
    api.update({ params: { id }, query: options, payload: spec })
  return DockerSwarmConfigs.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect,
    create: (spec) => api.create({ payload: spec }),
    update,
    remove: (id) => api.remove({ params: { id } }),
    modify: (id, f) =>
      modifyWith(
        inspect(id),
        (spec, version) => update(id, spec, { version }),
        f
      ).pipe(withOperation(engine, "docker.SwarmConfigs.modify", id))
  })
})

/**
 * Provides {@link DockerSwarmConfigs} over the `DockerEngine` in context,
 * built with {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer: Layer.Layer<DockerSwarmConfigs, never, DockerEngine> = Layer.effect(DockerSwarmConfigs, make)
