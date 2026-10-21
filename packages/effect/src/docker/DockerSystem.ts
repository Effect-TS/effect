/**
 * The Engine itself: ping, version, info, events, disk usage, registry
 * login and build-cache pruning.
 *
 * **Example** (Watching container events)
 *
 * ```ts import.meta.vitest
 * import { Effect, Stream } from "effect"
 * import { DockerSystem } from "effect/docker"
 *
 * const program = DockerSystem.DockerSystem.use((system) =>
 *   system.events({ filters: { type: "container", event: ["start", "die"] } }).pipe(
 *     Stream.take(10),
 *     Stream.runForEach((event) => Effect.log(event.Action, event.Actor?.ID))
 *   )
 * )
 * ```
 *
 * @stability unstable
 * @since 4.0.6
 */
import * as Context from "../Context.ts"
import type * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as Layer from "../Layer.ts"
import type * as Stream from "../Stream.ts"
import * as DockerApi from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import { apiClient, DockerEngine } from "./DockerEngine.ts"
import type { DockerError } from "./DockerError.ts"
import type * as DockerSchema from "./DockerSchema.ts"

// -----------------------------------------------------------------------------
// service
// -----------------------------------------------------------------------------

/**
 * The system API.
 *
 * @stability unstable
 * @category services
 * @since 4.0.6
 */
export class DockerSystem extends Context.Service<DockerSystem, {
  /**
   * Pings the Engine, and returns what `/_ping` reports.
   *
   * **Details**
   *
   * [Engine API: SystemPing](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemPing).
   * It sends a request every time, which makes it a liveness check.
   *
   * Typical reasons: `ConnectionFailed`, `ServerError`.
   */
  readonly ping: Effect.Effect<DockerApi.PingInfo, DockerError>
  /**
   * Returns the Engine's version information.
   *
   * **Details**
   *
   * [Engine API: SystemVersion](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemVersion).
   * Typical reasons: `ConnectionFailed`.
   */
  readonly version: Effect.Effect<DockerSchema.SystemVersion, DockerError>
  /**
   * Returns system-wide information about the Engine.
   *
   * **Details**
   *
   * [Engine API: SystemInfo](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemInfo).
   * Typical reasons: `ConnectionFailed`.
   */
  readonly info: Effect.Effect<DockerSchema.SystemInfo, DockerError>
  /**
   * Streams the Engine's events.
   *
   * **Details**
   *
   * [Engine API: SystemEvents](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemEvents).
   * Decoded line by line. Without `until` the stream never ends: use
   * `Stream.take` or interrupt it. `since` and `until` take any
   * `DateTime.Input`.
   *
   * Typical reasons: `BadRequest` (an invalid filter), `ConnectionFailed`,
   * `InvalidResponse`.
   */
  readonly events: (options?: {
    readonly since?: DateTime.DateTime.Input | undefined
    readonly until?: DateTime.DateTime.Input | undefined
    readonly filters?: DockerApi.Filters | undefined
  }) => Stream.Stream<DockerSchema.EventMessage, DockerError>
  /**
   * Returns the Engine's disk usage.
   *
   * **Details**
   *
   * [Engine API: SystemDataUsage](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemDataUsage).
   * `type` limits the object types computed. Before API 1.52 the Engine answers
   * with `LayersSize`, `Images`, `Containers`, `Volumes` and `BuildCache`; from
   * 1.52 with the `*Usage` fields (`verbose` adds the item lists, and requires
   * 1.52).
   *
   * Typical reasons: `Conflict` (a usage computation is already running),
   * `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly df: (options?: {
    readonly type?: ReadonlyArray<"container" | "image" | "volume" | "build-cache"> | undefined
    readonly verbose?: boolean | undefined
  }) => Effect.Effect<DockerSchema.SystemDataUsageResponse, DockerError>
  /**
   * Checks registry credentials, and returns an identity token when the
   * Registry issues one (`docker login` without storing anything).
   *
   * **Details**
   *
   * [Engine API: SystemAuth](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/System/operation/SystemAuth).
   * The password and the identity token are `Redacted`. The client never writes
   * the Docker config. Returns `undefined` when the Engine answers 204.
   *
   * Typical reasons: `Unauthorized`, `ServerError`, `ConnectionFailed`.
   */
  readonly auth: (
    credentials: DockerApi.AuthConfig
  ) => Effect.Effect<DockerApi.AuthResponse | undefined, DockerError>
  /**
   * Removes build cache.
   *
   * **Details**
   *
   * [Engine API: BuildPrune](https://docs.docker.com/reference/api/engine/version/v1.56/#tag/Image/operation/BuildPrune).
   * `reservedSpace`, `maxUsedSpace` and `minFreeSpace` are in bytes.
   * `maxUsedSpace` and `minFreeSpace` require API 1.48; below it,
   * `reservedSpace` is sent as `keep-storage`, its name there.
   *
   * Typical reasons: `ConnectionFailed`, `OptionNotSupported`.
   */
  readonly pruneBuildCache: (options?: {
    readonly all?: boolean | undefined
    readonly filters?: DockerApi.Filters | undefined
    readonly reservedSpace?: number | undefined
    readonly maxUsedSpace?: number | undefined
    readonly minFreeSpace?: number | undefined
  }) => Effect.Effect<DockerSchema.BuildPruneResponse, DockerError>
}>()("effect/docker/DockerSystem") {}

/**
 * Builds the {@link DockerSystem} service over the `DockerEngine` in context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.6
 */
export const make: Effect.Effect<DockerSystem["Service"], never, DockerEngine> = Effect.gen(function*() {
  const engine = yield* DockerEngine
  const api = yield* apiClient(engine, DockerApi.System, "docker.System")
  return DockerSystem.of({
    ping: api.ping(),
    version: api.version(),
    info: api.info(),
    events: (options) => api.events({ query: options ?? {} }),
    df: (options) => api.df({ query: options ?? {} }),
    auth: (credentials) => api.auth({ payload: credentials }),
    pruneBuildCache: (options) =>
      Effect.flatMap(engine.apiVersion, (negotiated) => {
        if (options?.reservedSpace === undefined || DockerConfig.compareApiVersions(negotiated, "1.48") >= 0) {
          return api.pruneBuildCache({ query: options ?? {} })
        }
        const { reservedSpace, ...query } = options
        return api.pruneBuildCache({ query: { ...query, keepStorage: reservedSpace } })
      })
  })
})

/**
 * Provides {@link DockerSystem} over the `DockerEngine` in context, built with
 * {@link make}. `Docker.layer` provides every service.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.6
 */
export const layer: Layer.Layer<DockerSystem, never, DockerEngine> = Layer.effect(DockerSystem, make)
