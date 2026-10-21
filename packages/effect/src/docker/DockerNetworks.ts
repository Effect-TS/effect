/**
 * Networks: list, inspect, create, remove, connect, disconnect and prune.
 *
 * Request bodies are the generated `DockerSchema` types.
 *
 * **Example** (Connecting a container to a new network)
 *
 * ```ts import.meta.vitest
 * import { Effect } from "effect"
 * import { DockerNetworks } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const networks = yield* DockerNetworks.DockerNetworks
 *   const { Id } = yield* networks.create({ Name: "app", Labels: { app: "demo" } })
 *   yield* networks.connect(Id, { Container: "db", EndpointConfig: { Aliases: ["database"] } })
 *   return Id
 * })
 * ```
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
 * The networks API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerNetworks extends Context.Service<DockerNetworks, {
  /**
   * Lists networks.
   *
   * **Details**
   *
   * [Engine API: NetworkList](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkList).
   * Typical reasons: `BadRequest` for an invalid filter, `ConnectionFailed`.
   */
  readonly list: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<ReadonlyArray<DockerSchema.NetworkSummary>, DockerError>
  /**
   * Inspects a network.
   *
   * **Details**
   *
   * [Engine API: NetworkInspect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkInspect).
   * Typical reasons: `NotFound`, `ConnectionFailed`.
   */
  readonly inspect: (
    id: string,
    options?: { readonly verbose?: boolean | undefined; readonly scope?: string | undefined }
  ) => Effect.Effect<DockerSchema.NetworkInspect, DockerError>
  /**
   * Creates a network.
   *
   * **Details**
   *
   * [Engine API: NetworkCreate](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkCreate).
   * `EnableIPv4` requires API 1.48.
   *
   * Typical reasons: `Conflict` (the name is taken), `Forbidden`, `NotFound`
   * (no such driver), `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly create: (
    config: DockerSchema.NetworkCreateRequest
  ) => Effect.Effect<DockerSchema.NetworkCreateResponse, DockerError>
  /**
   * Removes a network.
   *
   * **Details**
   *
   * [Engine API: NetworkDelete](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkDelete).
   * Typical reasons: `NotFound`, `Forbidden` (a predefined network),
   * `Conflict` (in use), `ConnectionFailed`.
   */
  readonly remove: (id: string) => Effect.Effect<void, DockerError>
  /**
   * Connects a container to a network.
   *
   * **Details**
   *
   * [Engine API: NetworkConnect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkConnect).
   * `EndpointConfig.GwPriority` requires API 1.48, and `EndpointConfig.MacAddress`
   * 1.54 (older Engines ignored it).
   *
   * Typical reasons: `NotFound`, `Forbidden`, `ConnectionFailed`,
   * `OptionNotSupported`.
   */
  readonly connect: (
    id: string,
    config: DockerSchema.NetworkConnectRequest
  ) => Effect.Effect<void, DockerError>
  /**
   * Disconnects a container from a network.
   *
   * **Details**
   *
   * [Engine API: NetworkDisconnect](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkDisconnect).
   * Typical reasons: `NotFound`, `Forbidden`, `ConnectionFailed`.
   */
  readonly disconnect: (
    id: string,
    config: DockerSchema.NetworkDisconnectRequest
  ) => Effect.Effect<void, DockerError>
  /**
   * Removes unused networks.
   *
   * **Details**
   *
   * [Engine API: NetworkPrune](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Network/operation/NetworkPrune).
   * Typical reasons: `Conflict` (a prune is already running),
   * `ConnectionFailed`.
   */
  readonly prune: (options?: {
    readonly filters?: DockerApi.Filters | undefined
  }) => Effect.Effect<DockerSchema.NetworkPruneResponse, DockerError>
}>()("effect/docker/DockerNetworks") {}

/**
 * Builds the {@link DockerNetworks} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerNetworks["Service"], never, DockerEngine> = Effect.gen(function*() {
  const api = yield* apiClient(yield* DockerEngine, DockerApi.Networks, "docker.Networks")
  return DockerNetworks.of({
    list: (options) => api.list({ query: options ?? {} }),
    inspect: (id, options) => api.inspect({ params: { id }, query: options ?? {} }),
    create: (config) => api.create({ payload: config }),
    remove: (id) => api.remove({ params: { id } }),
    connect: (id, config) => api.connect({ params: { id }, payload: config }),
    disconnect: (id, config) => api.disconnect({ params: { id }, payload: config }),
    prune: (options) => api.prune({ query: options ?? {} })
  })
})

/**
 * Provides {@link DockerNetworks} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerNetworks, never, DockerEngine> = Layer.effect(DockerNetworks, make)
