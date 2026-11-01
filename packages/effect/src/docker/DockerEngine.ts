/**
 * The connection to one Engine, which every service of `effect/docker` is
 * built over.
 *
 * A `DockerEngine` carries the `DockerConfig` it was built from, the
 * `HttpClient` every request goes through (upgraded ones for exec and attach
 * included), which speaks API 1.52. Every service of
 * `effect/docker` (`DockerSystem`, ...) is built over it, and reads the
 * configuration from it, never from context. Registry credentials are
 * `DockerRegistryAuth`'s, not the engine's.
 *
 * Provide it with `NodeDocker` from `@effect/platform-node`: its
 * `layerFromEnv` configures it as the Docker CLI does, and its `layer` builds
 * over the `DockerConfig` you provide. Both build the `DockerEngine` over
 * Node's `HttpClient`, and provide every service with `Docker.layer`. With an
 * `HttpClient` of your own, build it with {@link make} and add the services
 * with `Docker.layer` and a `DockerRegistryAuth`.
 *
 * **API version**
 *
 * The client speaks Docker Engine API 1.52, and only 1.52: its Schemas are
 * generated from that version's document, and every request is sent as
 * `/v1.52/...`. Nothing is negotiated. Docker Engine 29.0 introduced API 1.52,
 * and later Engines serve it too.
 *
 * Before its first request, the engine checks once, with the unversioned
 * `/version`, that the Engine's API range includes 1.52. An Engine that
 * doesn't serve it fails every request with `UnsupportedApiVersion`, before
 * any versioned request is sent; an older one must be upgraded (upgrading the
 * Docker CLI alone isn't enough). A failed check isn't cached. Building the
 * layer never contacts the Engine.
 *
 * **Example** (Building an engine over an `HttpClient` of your own)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer } from "effect"
 * import { DockerConfig, DockerEngine } from "effect/docker"
 * import { HttpClient } from "effect/http"
 *
 * // the `HttpClient` in context must reach the Engine at the configured Endpoint
 * const EngineLive = Layer.effect(
 *   DockerEngine.DockerEngine,
 *   Effect.gen(function*() {
 *     return yield* DockerEngine.make(yield* HttpClient.HttpClient)
 *   })
 * ).pipe(
 *   Layer.provide(DockerConfig.layer({ endpoint: { _tag: "Tcp", host: "docker.example.com", port: 2375 } }))
 * )
 *
 * const program = Effect.gen(function*() {
 *   const engine = yield* DockerEngine.DockerEngine
 *   return yield* engine.client.get("/info")
 * })
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import type * as HttpClient from "../http/HttpClient.ts"
import * as Option from "../Option.ts"
import * as Semaphore from "../Semaphore.ts"
import { System } from "./DockerApi.ts"
import * as DockerConfig from "./DockerConfig.ts"
import { DockerError, UnsupportedApiVersion } from "./DockerError.ts"
import { apiVersion, compareApiVersions } from "./internal/config.ts"
import { apiClient, makeClient } from "./internal/engine.ts"

/**
 * The connection to one Engine.
 *
 * @stability unstable
 * @category services
 * @since 4.0.7
 */
export class DockerEngine extends Context.Service<DockerEngine, {
  /** The resolved configuration the engine was built from; it never changes. */
  readonly config: DockerConfig.ResolvedConfig
  /**
   * The Engine's `HttpClient`: requests take an unversioned path such as
   * `/containers/json`. It adds the base URL, the `/v1.52` prefix (checking
   * on first use that the Engine serves it) and the config's `httpHeaders`.
   * It fails with `DockerError` only for `ConnectionFailed` and a failed
   * check: a response is returned whatever its status.
   */
  readonly client: HttpClient.HttpClient.With<DockerError>
}>()("effect/docker/DockerEngine") {}

/**
 * Checks, with the unversioned `/version`, that the Engine's API range
 * (`MinAPIVersion` to `ApiVersion`) includes the one the client speaks.
 */
const checkApiVersion = (
  config: DockerConfig.ResolvedConfig,
  httpClient: HttpClient.HttpClient
): Effect.Effect<Effect.Effect<void, DockerError>> =>
  Effect.map(
    apiClient(DockerEngine.of({ config, client: makeClient(config, httpClient) }), System, "docker.Engine"),
    (system) =>
      Effect.flatMap(system.version(), ({ ApiVersion: maximum, MinAPIVersion: minimum }) =>
        maximum !== undefined && compareApiVersions(maximum, apiVersion) >= 0 &&
          (minimum === undefined || compareApiVersions(minimum, apiVersion) <= 0)
          ? Effect.void
          : Effect.fail(
            new DockerError({
              reason: new UnsupportedApiVersion({ minimum, maximum, required: apiVersion }),
              operation: "docker.Engine.version"
            })
          ))
  )

/** Runs `effect` once successfully; failures are not cached, as in moby's client. */
const onceSuccessful = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> => {
  let result: Option.Option<A> = Option.none()
  const semaphore = Semaphore.makeUnsafe(1)
  const run = semaphore.withPermits(1)(Effect.suspend(() =>
    Option.isSome(result)
      ? Effect.succeed(result.value)
      : Effect.map(effect, (value) => {
        result = Option.some(value)
        return value
      })
  ))
  return Effect.suspend(() => Option.isSome(result) ? Effect.succeed(result.value) : run)
}

/**
 * Builds a `DockerEngine` over the `DockerConfig` in context and an
 * `HttpClient` that reaches its Endpoint.
 *
 * **Details**
 *
 * The `HttpClient` receives absolute URLs (`http://localhost/...` for a unix
 * socket, `http(s)://host:port/...` for TCP) and must route them to the
 * Endpoint. It must not impose timeouts of its own, and must support HTTP/1.1
 * upgrades for exec and attach.
 *
 * Nothing contacts the Engine until the first request, which first checks
 * that the Engine serves API 1.52. To fail fast when the Engine is
 * unreachable or too old, ping it while building your application's layer,
 * with a timeout of your choice.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make = (
  httpClient: HttpClient.HttpClient
): Effect.Effect<DockerEngine["Service"], never, DockerConfig.DockerConfig> =>
  Effect.gen(function*() {
    const config = yield* DockerConfig.DockerConfig
    const check = onceSuccessful(yield* checkApiVersion(config, httpClient))
    return DockerEngine.of({ config, client: makeClient(config, httpClient, check) })
  })
