/**
 * The Node.js layer for `effect/docker`.
 *
 * {@link layerFromEnv} provides `DockerEngine`, `DockerRegistryAuth` and every
 * `effect/docker` service, configured as the Docker CLI is (see
 * `DockerConfig.ResolvedConfig`), and {@link layer} provides them over the
 * `DockerConfig` you provide.
 *
 * **Example** (Reading the Engine's information)
 *
 * ```ts import.meta.vitest
 * import { NodeDocker } from "@effect/platform-node"
 * import { Effect } from "effect"
 * import { DockerSystem } from "effect/docker"
 *
 * const program = Effect.gen(function*() {
 *   const system = yield* DockerSystem.DockerSystem
 *   const info = yield* system.info
 *   return `${info.ServerVersion}: ${info.Containers} containers`
 * })
 *
 * // configured as the Docker CLI is
 * const main = program.pipe(Effect.provide(NodeDocker.layerFromEnv()))
 * ```
 *
 * @stability unstable
 * @since 4.0.7
 */
import * as Docker from "effect/docker/Docker"
import * as DockerConfig from "effect/docker/DockerConfig"
import * as DockerEngine from "effect/docker/DockerEngine"
import * as DockerRegistryAuth from "effect/docker/DockerRegistryAuth"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Host from "effect/net/Host"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import type * as Scope from "effect/Scope"
import * as NodeChildProcessSpawner from "./NodeChildProcessSpawner.ts"
import * as NodeFileSystem from "./NodeFileSystem.ts"
import * as NodeHttpClient from "./NodeHttpClient.ts"
import * as NodePath from "./NodePath.ts"
import * as NodeServices from "./NodeServices.ts"

// `tls.connect` sends SNI only with a `servername`: a domain name without the
// trailing dot, never an IP address (RFC 6066)
const servername = (host: string): { readonly servername?: string } => {
  const parsed = Host.hostFromString(host)
  return Result.isSuccess(parsed) && Host.isDomainName(parsed.success)
    ? { servername: Host.toRelative(parsed.success) }
    : {}
}

const tlsOptions = (endpoint: typeof DockerConfig.Endpoint.cases.Tcp.Type, tls: typeof DockerConfig.Tls.Type) => ({
  ...(tls.ca !== undefined ? { ca: tls.ca } : {}),
  ...(tls.clientCertificate !== undefined
    ? { cert: tls.clientCertificate.cert, key: Redacted.value(tls.clientCertificate.key) }
    : {}),
  ...servername(endpoint.host),
  rejectUnauthorized: tls.verify
})

// runs registry credential helpers
const spawnerLayer = NodeChildProcessSpawner.layer.pipe(
  Layer.provide(Layer.mergeAll(NodeFileSystem.layer, NodePath.layer))
)

/**
 * Builds a `DockerEngine` on Node.js from the `DockerConfig` in the context,
 * over a `node:http` `HttpClient` whose agents reach the Endpoint: its unix
 * socket, or TCP with the Endpoint's TLS settings.
 *
 * **Details**
 *
 * The client sets no timeouts (the Engine sends no headers until a `stop`
 * with a long timeout is done), and hands over the connection of exec and
 * attach upgrades. The agents are destroyed with the scope. Nothing contacts
 * the Engine.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.7
 */
export const make: Effect.Effect<
  DockerEngine.DockerEngine["Service"],
  never,
  DockerConfig.DockerConfig | Scope.Scope
> = Effect.gen(function*() {
  const { endpoint } = yield* DockerConfig.DockerConfig
  const agent = yield* NodeHttpClient.makeAgent(
    endpoint._tag === "Unix"
      ? { socketPath: endpoint.path }
      : endpoint.tls !== undefined
      ? tlsOptions(endpoint, endpoint.tls)
      : undefined
  )
  const httpClient = yield* NodeHttpClient.makeNodeHttp.pipe(
    Effect.provideService(NodeHttpClient.HttpAgent, agent)
  )
  return yield* DockerEngine.make(httpClient)
})

/**
 * Provides `DockerEngine`, `DockerRegistryAuth` and every service of
 * `Docker.layer` on Node.js, built with {@link make} from the `DockerConfig`
 * it requires.
 *
 * **Details**
 *
 * Registry credentials resolve as the Docker CLI resolves them
 * (`DockerRegistryAuth.layer`), with credential helpers run as Node.js child
 * processes. To resolve them another way, provide `Docker.layer` with
 * {@link make}'s engine and a `DockerRegistryAuth` of your own.
 *
 * Provide the configuration as its own layer: `DockerConfig.layer(config)`
 * for static values, or `DockerConfig.layerFromEnv`, which
 * {@link layerFromEnv} bundles. Building the layer never contacts the
 * Engine.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layer: Layer.Layer<
  DockerEngine.DockerEngine | DockerRegistryAuth.DockerRegistryAuth | Docker.Docker,
  never,
  DockerConfig.DockerConfig
> = Docker.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(
    Layer.effect(DockerEngine.DockerEngine, make),
    DockerRegistryAuth.layer.pipe(Layer.provide(spawnerLayer))
  ))
)

/**
 * Provides `DockerEngine`, `DockerRegistryAuth` and every service of
 * `Docker.layer` on Node.js, configured as a bare `docker` invocation is: {@link layer} over
 * `DockerConfig.layerFromEnv(overrides)`.
 *
 * **Details**
 *
 * The Docker CLI's configuration is read once, when the layer is built. A
 * value given in `overrides` wins over it, and its source is never read: an
 * `endpoint` skips Discovery, an `apiVersion` skips `DOCKER_API_VERSION`,
 * and so on. Building the layer never contacts the Engine.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.7
 */
export const layerFromEnv = (
  overrides?: Partial<DockerConfig.ResolvedConfig> | undefined
): Layer.Layer<
  DockerEngine.DockerEngine | DockerRegistryAuth.DockerRegistryAuth | Docker.Docker,
  DockerConfig.DockerConfigError
> =>
  layer.pipe(
    Layer.provide(DockerConfig.layerFromEnv(overrides)),
    Layer.provide(NodeServices.layer)
  )
