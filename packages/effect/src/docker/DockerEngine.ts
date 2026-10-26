/**
 * The connection to one Engine, which every service of `effect/docker` is
 * built over.
 *
 * A `DockerEngine` carries the `DockerConfig` it was built from, the
 * `HttpClient` every request goes through (upgraded ones for exec and attach
 * included), and the negotiated API version. Every service of
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
 * **API versions**
 *
 * The client speaks API 1.44 up to 1.56, the version its Schemas are
 * generated from. The first request negotiates, as moby's own client does: it
 * calls the unversioned `/_ping` (`HEAD`, falling back to `GET`), uses
 * `min(1.56, Api-Version)` (1.44 when the Engine sends no `Api-Version`),
 * caches the result for the layer's lifetime, and prefixes every request
 * with `/v{version}`. An Engine that can't serve 1.44 fails with
 * `UnsupportedApiVersion`. A failed negotiation isn't cached. Building the
 * layer never contacts the Engine.
 *
 * Pinning a version (`DockerConfig`'s `apiVersion`, or `DOCKER_API_VERSION`)
 * turns negotiation off, and the pin is used as-is. `DockerConfig`'s layers
 * check that it is `major.minor` and at least 1.44.
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
 *   return yield* engine.apiVersion
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
import { compareApiVersions, maximumApiVersion, minimumApiVersion, parseApiVersion } from "./internal/config.ts"
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
   * `/containers/json`. It adds the base URL, the negotiated `/v{version}`
   * prefix (negotiating on first use) and the config's `httpHeaders`. It
   * fails with `DockerError` only for `ConnectionFailed` and a failed
   * negotiation: a response is returned whatever its status.
   */
  readonly client: HttpClient.HttpClient.With<DockerError>
  /** The negotiated (or pinned) API version. Negotiates on first use. */
  readonly apiVersion: Effect.Effect<string, DockerError>
}>()("effect/docker/DockerEngine") {}

/**
 * The Engine's maximum API version from the unversioned `/_ping`, through
 * `DockerApi.System`: `HEAD` first, then `GET` if that fails for any reason
 * but the connection. As in moby's client, a connection failure doesn't dial
 * again.
 */
const pingApiVersion = (
  config: DockerConfig.ResolvedConfig,
  httpClient: HttpClient.HttpClient
): Effect.Effect<Effect.Effect<string | undefined, DockerError>> =>
  Effect.map(
    apiClient(
      DockerEngine.of({
        config,
        client: makeClient(config, httpClient),
        // a version gate needs the negotiated version, and no endpoint of `/_ping` has one
        apiVersion: Effect.die(new Error("The unversioned client has no API version"))
      }),
      System,
      "docker.Engine"
    ),
    (system) =>
      system.pingHead().pipe(
        Effect.catchIf((error) => error.reason._tag !== "ConnectionFailed", () => system.ping()),
        Effect.map((ping) => ping.apiVersion)
      )
  )

/**
 * Computes the negotiated version from what the Engine reports: the lower of
 * our maximum and the Engine's version. An Engine that reports no version gets
 * the minimum, 1.44, rather than an assumed maximum.
 */
const negotiate = (engineVersion: string | undefined): Effect.Effect<string, DockerError> => {
  if (engineVersion === undefined) return Effect.succeed(minimumApiVersion)
  if (
    parseApiVersion(engineVersion) === undefined ||
    compareApiVersions(engineVersion, minimumApiVersion) < 0
  ) {
    return Effect.fail(
      new DockerError({
        reason: new UnsupportedApiVersion({ engineVersion, minimum: minimumApiVersion })
      })
    )
  }
  return Effect.succeed(
    compareApiVersions(engineVersion, maximumApiVersion) < 0
      ? engineVersion
      : maximumApiVersion
  )
}

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
 * Nothing contacts the Engine until the first request. With the config's
 * `apiVersion` set, negotiation is off and the version is used as-is:
 * `DockerConfig`'s layers have checked it. To fail fast when the Engine is
 * unreachable, ping it while building your application's layer, with a
 * timeout of your choice.
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
    const apiVersion = config.apiVersion !== undefined
      ? Effect.succeed(config.apiVersion)
      : onceSuccessful(Effect.flatMap(yield* pingApiVersion(config, httpClient), negotiate))
    return DockerEngine.of({
      config,
      client: makeClient(config, httpClient, apiVersion),
      apiVersion
    })
  })
